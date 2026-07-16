import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import type { SystemSecretsService } from '../../secrets/system-secrets.service';
import {
  EpoDocumentAuthError,
  EpoDocumentNotAvailableError,
} from '../epo-document.errors';
import { EpoProvider } from './epo.provider';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function mockJsonResponse(data: unknown, status = 200) {
  const body = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function mockTextResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

async function makePdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage();
  return Buffer.from(await doc.save());
}

const sampleBiblio = {
  'ops:world-patent-data': {
    'exchange-documents': {
      'exchange-document': [
        {
          'bibliographic-data': {
            'invention-title': [{ '@lang': 'en', $: 'Widget Patent' }],
            parties: {
              applicants: {
                applicant: [
                  { 'applicant-name': { name: { $: 'Acme Corp' } } },
                ],
              },
            },
            'publication-reference': {
              'document-id': [
                {
                  country: { $: 'EP' },
                  'doc-number': { $: '3000000' },
                  kind: { $: 'A1' },
                  date: { $: '20200101' },
                },
              ],
            },
          },
        },
      ],
    },
  },
};

const sampleSearch = {
  'ops:world-patent-data': {
    'ops:biblio-search': {
      'ops:search-result': {
        'ops:publication-reference': [
          {
            'document-id': [
              {
                country: { $: 'EP' },
                'doc-number': { $: '1111111' },
                kind: { $: 'A1' },
                date: { $: '20210601' },
              },
              {
                country: { $: 'EP' },
                'doc-number': { $: '1111111' },
                kind: { $: 'A1' },
              },
            ],
          },
        ],
      },
    },
  },
};

const sampleLegal = {
  'ops:world-patent-data': {
    'ops:legal': [
      {
        '@code': '17P',
        'ops:L007EP': { $: '20210315' },
        '@desc': 'Request for examination',
      },
      {
        '@code': 'B1',
        'ops:L007EP': { $: '20220101' },
        '@desc': 'Patent granted',
      },
    ],
    'application-reference': [
      {
        '@doc-id': '237170531',
        'document-id': [{ 'doc-number': { $: '23717053' } }],
      },
    ],
    'publication-reference': [
      {
        'document-id': [
          {
            country: { $: 'EP' },
            'doc-number': { $: '3000000' },
            kind: { $: 'A1' },
          },
        ],
      },
    ],
  },
};

function sampleImagesInquiry(pages = 1) {
  return {
    'ops:world-patent-data': {
      'ops:document-inquiry': {
        'ops:inquiry-result': {
          'ops:document-instance': [
            {
              '@link':
                '/published-data/publication/epodoc/EP3000000.A1/images/fullimage',
              '@number-of-pages': String(pages),
              '@desc': 'FullDocument',
            },
          ],
        },
      },
    },
  };
}

describe('EpoProvider', () => {
  let provider: EpoProvider;
  let config: { get: jest.Mock };
  let secrets: {
    getSecretValue: jest.Mock;
    getNonSecretValue: jest.Mock;
  };
  let pdfBuffer: Buffer;

  beforeAll(async () => {
    pdfBuffer = await makePdfBuffer();
  });

  beforeEach(async () => {
    fetchMock.mockReset();
    config = { get: jest.fn().mockReturnValue(undefined) };
    secrets = {
      getSecretValue: jest.fn().mockResolvedValue(null),
      getNonSecretValue: jest.fn().mockResolvedValue(null),
    };
    provider = new EpoProvider(
      config as unknown as ConfigService,
      secrets as unknown as SystemSecretsService,
    );
    await provider.refreshCredentials();
  });

  function mockTokenAndOps(opsHandler: (url: string) => unknown) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/accesstoken')) {
        return mockJsonResponse({
          access_token: 'test-token',
          expires_in: 3600,
        });
      }
      if (init?.method === 'GET' && url.endsWith('.pdf?Range=1')) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => ({}),
          arrayBuffer: async () => pdfBuffer.buffer.slice(0),
        };
      }
      if (init?.method === 'GET' && /\.pdf\?Range=\d+$/.test(url)) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => ({}),
          arrayBuffer: async () => pdfBuffer.buffer.slice(0),
        };
      }
      return mockJsonResponse(opsHandler(url));
    });
  }

  it('loads credentials from env when DB secrets are absent', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'env-key';
      if (key === 'EPO_CONSUMER_SECRET') return 'env-secret';
      return undefined;
    });
    await provider.refreshCredentials();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.getCredentialSource()).toBe('env');
  });

  it('prefers database credentials over env', async () => {
    secrets.getSecretValue
      .mockResolvedValueOnce('db-key')
      .mockResolvedValueOnce('db-secret');
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'env-key';
      if (key === 'EPO_CONSUMER_SECRET') return 'env-secret';
      return undefined;
    });
    await provider.refreshCredentials();
    expect(provider.getCredentialSource()).toBe('database');
  });

  it('warns on module init when not configured', async () => {
    const warnSpy = jest.spyOn(
      (provider as unknown as { logger: { warn: jest.Mock } }).logger,
      'warn',
    );
    await provider.onModuleInit();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('throws when getting token without credentials', async () => {
    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('obtains and caches access token', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    fetchMock.mockResolvedValue(
      mockJsonResponse({ access_token: 'tok-1', expires_in: 7200 }),
    );

    await expect(provider.getAccessToken()).resolves.toBe('tok-1');
    await expect(provider.getAccessToken()).resolves.toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when token endpoint fails', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();
    fetchMock.mockResolvedValue(mockTextResponse('denied', 429));
    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when token response lacks access_token', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();
    fetchMock.mockResolvedValue(mockJsonResponse({ expires_in: 3600 }));
    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('getBibliographicData parses OPS biblio payload', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/biblio')) return sampleBiblio;
      throw new Error(`unexpected url ${url}`);
    });

    await expect(provider.getBibliographicData('EP3000000')).resolves.toEqual({
      publicationNumber: 'EP3000000.A1',
      title: 'Widget Patent',
      applicant: 'Acme Corp',
      publicationDate: '2020-01-01',
    });
  });

  it('getBibliographicData rejects empty patent number', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();
    await expect(provider.getBibliographicData('  ')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('searchPublishedData returns empty for blank query', async () => {
    await expect(provider.searchPublishedData('   ')).resolves.toEqual([]);
  });

  it('searchPublishedData parses hits and deduplicates', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/search?')) return sampleSearch;
      throw new Error(`unexpected url ${url}`);
    });

    const hits = await provider.searchPublishedData('Widget Mark');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      publicationNumber: 'EP1111111.A1',
      publicationDate: '2021-06-01',
    });
  });

  it('getLegalStatus parses events and refs', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/legal/')) return sampleLegal;
      throw new Error(`unexpected url ${url}`);
    });

    const status = await provider.getLegalStatus('EP237170531');
    expect(status.publicationNumber).toBe('EP3000000.A1');
    expect(status.applicationRef).toMatchObject({
      baseNumber: '23717053',
      checkDigit: '1',
      epodoc: 'EP237170531',
    });
    expect(status.events.length).toBeGreaterThanOrEqual(2);
    expect(status.events.some((e) => e.kind === 'grant')).toBe(true);
    expect(status.events.some((e) => e.kind === 'office_action')).toBe(true);
  });

  it('getLegalStatus throws when all attempts fail', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/accesstoken')) {
        return mockJsonResponse({ access_token: 't', expires_in: 3600 });
      }
      return mockTextResponse('not found', 404);
    });

    await expect(provider.getLegalStatus('EP9999999')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('getDocument fetches and merges multi-page PDFs', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/images')) return sampleImagesInquiry(2);
      throw new Error(`unexpected url ${url}`);
    });

    const doc = await provider.getDocument('EP3000000.A1');
    expect(doc.mimeType).toBe('application/pdf');
    expect(doc.pageCount).toBe(2);
    expect(doc.fileName).toContain('EPO-EP3000000.A1-fullimage.pdf');
    expect(doc.buffer.length).toBeGreaterThan(0);
  });

  it('getDocument throws when no image pages', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/images')) {
        return {
          'ops:world-patent-data': {
            'ops:document-inquiry': { 'ops:inquiry-result': {} },
          },
        };
      }
      throw new Error(`unexpected url ${url}`);
    });

    await expect(provider.getDocument('EP3000000')).rejects.toBeInstanceOf(
      EpoDocumentNotAvailableError,
    );
  });

  it('resolvePublicationNumber prefers legal publication ref', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    mockTokenAndOps((url) => {
      if (url.includes('/legal/')) return sampleLegal;
      throw new Error(`unexpected url ${url}`);
    });

    await expect(provider.resolvePublicationNumber('EP237170531')).resolves.toBe(
      'EP3000000.A1',
    );
  });

  it('resolvePublicationNumber falls back to biblio then EP prefix', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/accesstoken')) {
        return mockJsonResponse({ access_token: 't', expires_in: 3600 });
      }
      if (url.includes('/legal/')) {
        return mockTextResponse('not found', 404);
      }
      if (url.includes('/biblio')) {
        return mockJsonResponse(sampleBiblio);
      }
      return mockTextResponse('err', 500);
    });

    await expect(provider.resolvePublicationNumber('3000000')).resolves.toBe(
      'EP3000000.A1',
    );
  });

  it('retries OPS JSON on 401 and surfaces auth errors for images', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    let authCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/accesstoken')) {
        authCalls += 1;
        return mockJsonResponse({
          access_token: `tok-${authCalls}`,
          expires_in: 3600,
        });
      }
      if (url.includes('/images')) {
        return mockTextResponse('forbidden', 403);
      }
      return mockTextResponse('unauthorized', 401);
    });

    await expect(provider.getDocument('EP3000000')).rejects.toBeInstanceOf(
      EpoDocumentAuthError,
    );
  });

  it('opsGetJson throws on invalid JSON body', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_CONSUMER_KEY') return 'k';
      if (key === 'EPO_CONSUMER_SECRET') return 's';
      return undefined;
    });
    await provider.refreshCredentials();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/accesstoken')) {
        return mockJsonResponse({ access_token: 't', expires_in: 3600 });
      }
      return mockTextResponse('not-json', 200);
    });

    await expect(provider.getBibliographicData('EP1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
