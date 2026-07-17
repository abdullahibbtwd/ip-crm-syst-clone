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

/** Matches default OPS `/auth/accesstoken` and custom env paths like `/auth/token`. */
function isEpoAuthUrl(url: string): boolean {
  return url.includes('/auth/accesstoken') || url.includes('/auth/token');
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
      if (isEpoAuthUrl(url)) {
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
      if (isEpoAuthUrl(url)) {
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
      if (isEpoAuthUrl(url)) {
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
      if (isEpoAuthUrl(url)) {
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
      if (isEpoAuthUrl(url)) {
        return mockJsonResponse({ access_token: 't', expires_in: 3600 });
      }
      return mockTextResponse('not-json', 200);
    });

    await expect(provider.getBibliographicData('EP1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  describe('credential and module init branches', () => {
    it('logs configured message on module init when credentials exist', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      await provider.refreshCredentials();
      const logSpy = jest.spyOn(
        (provider as unknown as { logger: { log: jest.Mock } }).logger,
        'log',
      );
      await provider.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('EPO OPS base URL'),
      );
      logSpy.mockRestore();
    });

    it('loads env secret from EPO_CONSUMER_SECRET_KEY fallback', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'env-key';
        if (key === 'EPO_CONSUMER_SECRET_KEY') return 'alt-secret';
        return undefined;
      });
      await provider.refreshCredentials();
      expect(provider.isConfigured()).toBe(true);
    });

    it('uses database API and auth URLs with trailing slash stripped', async () => {
      secrets.getNonSecretValue.mockImplementation(async (_c, key: string) => {
        if (key === 'epo.api_base_url') return 'https://custom.epo/3.2/rest-services/';
        if (key === 'epo.auth_url') return 'https://custom.epo/3.2/auth/accesstoken';
        return null;
      });
      secrets.getSecretValue
        .mockResolvedValueOnce('db-key')
        .mockResolvedValueOnce('db-secret');
      await provider.refreshCredentials();
      expect(provider.getCredentialSource()).toBe('database');
    });

    it('refreshes credentials on getAccessToken when initially unconfigured', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      fetchMock.mockResolvedValue(
        mockJsonResponse({ access_token: 'late-tok', expires_in: 3600 }),
      );
      await expect(provider.getAccessToken()).resolves.toBe('late-tok');
    });
  });

  describe('biblio and search alternate payloads', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    it('getBibliographicData tries docdb first for non-EP numbers', async () => {
      const calls: string[] = [];
      mockTokenAndOps((url) => {
        calls.push(url);
        if (url.includes('/docdb/3000000/biblio')) return sampleBiblio;
        throw new Error('miss');
      });
      await provider.getBibliographicData('3000000');
      expect(calls[0]).toContain('/docdb/');
    });

    it('getBibliographicData falls back to second reference type after 404', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/epodoc/EP3000000/biblio')) {
          return mockTextResponse('not found', 404);
        }
        if (url.includes('/docdb/EP3000000/biblio')) {
          return mockJsonResponse(sampleBiblio);
        }
        return mockTextResponse('err', 500);
      });
      const result = await provider.getBibliographicData('EP3000000');
      expect(result.title).toBe('Widget Patent');
    });

    it('parseBiblio handles alternate applicant and date formats', async () => {
      const altBiblio = {
        'ops:world-patent-data': {
          'exchange-documents': {
            'exchange-document': [
              {
                'bibliographic-data': {
                  'invention-title': { '@lang': 'de', $: 'German Title' },
                  parties: {
                    applicants: {
                      applicant: [{ name: { $: 'Solo Applicant' } }],
                    },
                  },
                  'publication-reference': {
                    'document-id': {
                      country: { $: 'EP' },
                      'doc-number': { $: '2000000' },
                      date: { $: '2020-06-15' },
                    },
                  },
                },
              },
            ],
          },
        },
      };
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) return altBiblio;
        throw new Error(`unexpected ${url}`);
      });
      const result = await provider.getBibliographicData('EP2000000');
      expect(result.applicant).toBe('Solo Applicant');
      expect(result.publicationDate).toBe('2020-06-15');
      expect(result.publicationNumber).toBe('EP2000000');
    });

    it('searchPublishedData uses ti= for single-word queries', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/search?')) {
          expect(url).toContain('ti%3DWidget');
          return { 'ops:world-patent-data': {} };
        }
        throw new Error(`unexpected ${url}`);
      });
      await expect(provider.searchPublishedData('Widget')).resolves.toEqual([]);
    });

    it('searchPublishedData returns empty when hits lack country or doc-number', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/search?')) {
          return {
            'ops:world-patent-data': {
              'ops:biblio-search': {
                'ops:search-result': {
                  'publication-reference': [
                    { 'document-id': [{ country: { $: 'EP' } }] },
                  ],
                },
              },
            },
          };
        }
        throw new Error(`unexpected ${url}`);
      });
      await expect(provider.searchPublishedData('X')).resolves.toEqual([]);
    });
  });

  describe('legal status family and event classification', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    const familyLegal = {
      'ops:world-patent-data': {
        'ops:patent-family': {
          'ops:family-member': [
            {
              'ops:legal': [
                {
                  '@code': '18W',
                  'ops:L007EP': { $: '20220301' },
                  '@desc': 'Application deemed withdrawn',
                },
              ],
              'ops:bibliographic-data': {
                'ops:application-reference': [
                  {
                    '@doc-id': '123456789',
                    'ops:document-id': [{ 'ops:doc-number': { $: '12345678' } }],
                  },
                ],
                'ops:publication-reference': [
                  {
                    'ops:document-id': [
                      {
                        country: { $: 'EP' },
                        'doc-number': { $: '4000000' },
                        kind: { $: 'B1' },
                      },
                    ],
                  },
                ],
              },
            },
            {
              legal: {
                'legal-event': [
                  {
                    code: 'RANDOM',
                    date: { $: '20200101' },
                    description: 'Miscellaneous update',
                  },
                ],
              },
            },
          ],
        },
      },
    };

    it('parses family-member legal events including refusal and other kinds', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) return familyLegal;
        throw new Error(`unexpected ${url}`);
      });
      const status = await provider.getLegalStatus('EP123456789');
      expect(status.events.some((e) => e.kind === 'refusal')).toBe(true);
      expect(status.events.some((e) => e.kind === 'other')).toBe(true);
      expect(status.publicationRef?.kind).toBe('B1');
      expect(status.applicationRef?.baseNumber).toBe('12345678');
    });

    it('deduplicates identical legal events', async () => {
      const dupLegal = {
        'ops:world-patent-data': {
          'ops:legal': [
            {
              '@code': '17P',
              'ops:L007EP': { $: '20210315' },
              '@desc': 'Request',
            },
            {
              '@code': '17P',
              'ops:L007EP': { $: '20210315' },
              '@desc': 'Request',
            },
          ],
        },
      };
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) return dupLegal;
        throw new Error(`unexpected ${url}`);
      });
      const status = await provider.getLegalStatus('EP1111111');
      expect(status.events).toHaveLength(1);
    });

    it('getLegalStatus succeeds on later attempt type after early 404s', async () => {
      let legalCalls = 0;
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/legal/')) {
          legalCalls += 1;
          if (legalCalls < 3) return mockTextResponse('not found', 404);
          return mockJsonResponse(sampleLegal);
        }
        return mockTextResponse('err', 500);
      });
      const status = await provider.getLegalStatus('EP237170531');
      expect(status.events.length).toBeGreaterThan(0);
    });
  });

  describe('images and document fetch edge cases', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    it('getDocument returns single-page PDF without merge', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) return sampleImagesInquiry(1);
        throw new Error(`unexpected ${url}`);
      });
      const doc = await provider.getDocument('EP3000000.A1');
      expect(doc.pageCount).toBe(1);
    });

    it('parseImagesInquiry prefers fullimage path when desc differs', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) {
          return {
            'ops:world-patent-data': {
              'ops:document-inquiry': {
                'ops:inquiry-result': {
                  'ops:document-instance': [
                    {
                      link: '/published-data/publication/epodoc/EP3000000.A1/images/thumbnail',
                      'number-of-pages': '1',
                      desc: 'Thumbnail',
                    },
                    {
                      '@link':
                        '/published-data/publication/epodoc/EP3000000.A1/images/fullimage',
                      '@number-of-pages': '1',
                      '@desc': 'FullDocument',
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(`unexpected ${url}`);
      });
      const doc = await provider.getDocument('EP3000000.A1');
      expect(doc.imagePath).toContain('fullimage');
    });

    it('fetchImagePage retries after 401 and succeeds', async () => {
      let imageGets = 0;
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({
            access_token: 'tok',
            expires_in: 3600,
          });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          imageGets += 1;
          if (imageGets === 1) {
            return { ok: false, status: 401, text: async () => '', json: async () => ({}) };
          }
          return {
            ok: true,
            status: 200,
            text: async () => '',
            json: async () => ({}),
            arrayBuffer: async () => pdfBuffer.buffer.slice(0),
          };
        }
        return mockTextResponse('err', 500);
      });
      const doc = await provider.getDocument('EP3000000');
      expect(doc.buffer.length).toBeGreaterThan(0);
      expect(imageGets).toBeGreaterThanOrEqual(2);
    });

    it('fetchImagePage throws not available on 404', async () => {
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          return { ok: false, status: 404, text: async () => 'missing' };
        }
        return mockTextResponse('err', 500);
      });
      await expect(provider.getDocument('EP3000000')).rejects.toBeInstanceOf(
        EpoDocumentNotAvailableError,
      );
    });

    it('inquireImages maps not-found ServiceUnavailableException', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('Patent not found in EPO OPS', 404);
      });
      await expect(provider.getDocument('EP9999999')).rejects.toBeInstanceOf(
        EpoDocumentNotAvailableError,
      );
    });

    it('opsGetJson retries 401 and succeeds for biblio', async () => {
      let biblioCalls = 0;
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/biblio')) {
          biblioCalls += 1;
          if (biblioCalls === 1) {
            return { ok: false, status: 401, text: async () => 'unauth' };
          }
          return mockJsonResponse(sampleBiblio);
        }
        return mockTextResponse('err', 500);
      });
      const result = await provider.getBibliographicData('EP3000000');
      expect(result.title).toBe('Widget Patent');
    });

    it('opsGetJson throws rate limit on non-404 errors', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('rate limited', 429);
      });
      await expect(provider.getBibliographicData('EP1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('resolvePublicationNumber branches', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    it('returns null for blank publication number', async () => {
      await expect(provider.resolvePublicationNumber('  ')).resolves.toBeNull();
    });

    it('prefixes EP when legal and biblio both fail', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('not found', 404);
      });
      await expect(provider.resolvePublicationNumber('5000000')).resolves.toBe(
        'EP5000000',
      );
    });
  });

  describe('extended branch coverage', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        if (key === 'EPO_API_BASE_URL') return 'https://custom.ops/';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    function legalPayload(events: unknown[], extras: Record<string, unknown> = {}) {
      return {
        'ops:world-patent-data': {
          'ops:legal': events,
          ...extras,
        },
      };
    }

    it('classifies explicit prosecution codes STAA EXRE R1 D1 PGFP', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return legalPayload([
            { '@code': 'STAA', 'ops:L007EP': { $: '20210101' } },
            { '@code': 'EXRE', 'ops:L007EP': { $: '20210201' } },
            { '@code': 'R1', 'ops:L007EP': { $: '20210301' } },
            { '@code': 'D1', 'ops:L007EP': { $: '20210401' } },
            { '@code': 'PGFP', 'ops:L007EP': { $: '20210501' } },
          ]);
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP1111111');
      expect(status.events.filter((e) => e.kind === 'office_action')).toHaveLength(4);
      expect(status.events.filter((e) => e.kind === 'grant')).toHaveLength(1);
    });

    it('classifies events from description when code is unknown', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return legalPayload([
            {
              code: 'X99',
              date: { $: '20210601' },
              description: 'Decision to grant patent',
            },
            {
              code: 'Y88',
              date: { $: '20210701' },
              description: 'Application deemed withdrawn',
            },
            {
              code: 'Z77',
              date: { $: '20210801' },
              description: 'Substantive examination communication',
            },
          ]);
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP2222222');
      expect(status.events.some((e) => e.kind === 'grant')).toBe(true);
      expect(status.events.some((e) => e.kind === 'refusal')).toBe(true);
      expect(status.events.some((e) => e.kind === 'office_action')).toBe(true);
    });

    it('parses legal events with L018EP dates and L008EP codes', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return legalPayload([
            {
              'ops:L008EP': { $: '17P' },
              'ops:L018EP': { $: '20210915' },
              'ops:L500EP': [{ '@lang': 'en', $: 'Examination requested' }],
            },
          ]);
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP3333333');
      expect(status.events[0]?.date).toBe('2021-09-15');
      expect(status.events[0]?.kind).toBe('office_action');
    });

    it('flattens nested legal-event wrappers without top-level codes', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return legalPayload([
            {
              'legal-event': [
                {
                  '@code': 'B1',
                  'ops:L007EP': { $: '20220101' },
                  '@desc': 'Patent granted',
                },
              ],
            },
          ]);
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP4444444');
      expect(status.events.some((e) => e.kind === 'grant')).toBe(true);
    });

    it('extracts application ref from ops-prefixed document-id', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return legalPayload([], {
            'ops:application-reference': [
              {
                'doc-id': '987654321',
                'ops:document-id': [{ 'ops:doc-number': { $: '98765432' } }],
              },
            ],
          });
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP987654321');
      expect(status.applicationRef?.baseNumber).toBe('98765432');
      expect(status.applicationRef?.checkDigit).toBe('1');
    });

    it('prefers B1 publication ref over A2 in family payload', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:patent-family': {
                'ops:family-member': [
                  {
                    'ops:bibliographic-data': {
                      'ops:publication-reference': [
                        {
                          'ops:document-id': [
                            {
                              country: { $: 'EP' },
                              'doc-number': { $: '5000001' },
                              kind: { $: 'A2' },
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    'ops:publication-reference': [
                      {
                        'ops:document-id': [
                          {
                            country: { $: 'EP' },
                            'doc-number': { $: '5000001' },
                            kind: { $: 'B1' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              'ops:legal': [{ '@code': '17P', 'ops:L007EP': { $: '20210101' } }],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP5000001');
      expect(status.publicationRef?.kind).toBe('B1');
    });

    it('parseBiblio handles applicant-name array and non-8-digit dates', async () => {
      const biblio = {
        'ops:world-patent-data': {
          'exchange-documents': {
            'exchange-document': [
              {
                'bibliographic-data': {
                  'invention-title': [
                    { '@lang': 'fr', $: 'French' },
                    { '@lang': 'en', $: 'English Title' },
                  ],
                  parties: {
                    applicants: {
                      applicant: [
                        {
                          'applicant-name': [
                            { '@lang': 'de', $: 'German Name' },
                            { '@lang': 'en', $: 'English Applicant' },
                          ],
                        },
                      ],
                    },
                  },
                  'publication-reference': {
                    'document-id': {
                      country: { $: 'EP' },
                      'doc-number': { $: '6000000' },
                      date: { $: '2020-03-15' },
                    },
                  },
                },
              },
            ],
          },
        },
      };
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) return biblio;
        throw new Error(url);
      });
      const result = await provider.getBibliographicData('EP6000000');
      expect(result.title).toBe('English Title');
      expect(result.applicant).toBe('English Applicant');
      expect(result.publicationDate).toBe('2020-03-15');
    });

    it('searchPublishedData parses non-ops publication-reference shape', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/search?')) {
          return {
            'ops:world-patent-data': {
              'biblio-search': {
                'search-result': {
                  'publication-reference': [
                    {
                      'document-id': [
                        {
                          country: { $: 'EP' },
                          'doc-number': { $: '7000000' },
                          kind: { $: 'A1' },
                          date: { $: '20220301' },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const hits = await provider.searchPublishedData('Gadget');
      expect(hits[0]?.publicationNumber).toBe('EP7000000.A1');
      expect(hits[0]?.publicationDate).toBe('2022-03-01');
    });

    it('searchPublishedData strips embedded quotes from multi-word queries', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/search?')) {
          expect(url).toContain('ti%20all');
          expect(url).not.toContain('%22%22');
          return { 'ops:world-patent-data': {} };
        }
        throw new Error(url);
      });
      await provider.searchPublishedData('Widget "Pro"');
    });

    it('getBibliographicData throws generic error when both ref types fail non-SUE', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('network down', 500);
      });
      await expect(provider.getBibliographicData('EP8888888')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('getLegalStatus rejects empty patent number', async () => {
      await expect(provider.getLegalStatus('  ')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('getLegalStatus throws generic error after non-SUE failures', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('server error', 500);
      });
      await expect(provider.getLegalStatus('EP7777777')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('refreshes expired cached token on next request', async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockJsonResponse({ access_token: 'short-lived', expires_in: 0 }),
        )
        .mockResolvedValueOnce(
          mockJsonResponse({ access_token: 'fresh', expires_in: 3600 }),
        )
        .mockResolvedValue(
          mockJsonResponse(sampleBiblio),
        );
      await provider.getAccessToken();
      await expect(provider.getAccessToken()).resolves.toBe('fresh');
      expect(fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes('/auth/accesstoken'),
      ).length).toBeGreaterThanOrEqual(2);
    });

    it('inquireImages succeeds on later publication candidate', async () => {
      let imageCalls = 0;
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          imageCalls += 1;
          if (imageCalls === 1) {
            return mockTextResponse('not found', 404);
          }
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          return {
            ok: true,
            status: 200,
            text: async () => '',
            json: async () => ({}),
            arrayBuffer: async () => pdfBuffer.buffer.slice(0),
          };
        }
        return mockTextResponse('err', 500);
      });
      const doc = await provider.getDocument('EP3000000');
      expect(doc.pageCount).toBe(1);
      expect(imageCalls).toBeGreaterThanOrEqual(2);
    });

    it('parseImagesInquiry selects path containing fullimage when desc differs', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) {
          return {
            'ops:world-patent-data': {
              'ops:document-inquiry': {
                'ops:inquiry-result': {
                  'ops:document-instance': [
                    {
                      link: 'rest-services/3.2/published-data/publication/epodoc/EP3000000.A1/images/fullimage.pdf',
                      'number-of-pages': '2',
                      desc: 'Scan',
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const doc = await provider.getDocument('EP3000000.A1');
      expect(doc.imagePath).toContain('fullimage');
      expect(doc.pageCount).toBe(2);
    });

    it('fetchImagePage throws ServiceUnavailableException on 500', async () => {
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          return { ok: false, status: 500, text: async () => 'upstream' };
        }
        return mockTextResponse('err', 500);
      });
      await expect(provider.getDocument('EP3000000')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('fetchImagePage retries 403 and succeeds', async () => {
      let pageGets = 0;
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          pageGets += 1;
          if (pageGets === 1) {
            return { ok: false, status: 403, text: async () => '' };
          }
          return {
            ok: true,
            status: 200,
            text: async () => '',
            json: async () => ({}),
            arrayBuffer: async () => pdfBuffer.buffer.slice(0),
          };
        }
        return mockTextResponse('err', 500);
      });
      const doc = await provider.getDocument('EP3000000');
      expect(doc.buffer.length).toBeGreaterThan(0);
      expect(pageGets).toBeGreaterThanOrEqual(2);
    });

    it('opsGetJson 401 retry failure on biblio throws ServiceUnavailableException', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return { ok: false, status: 401, text: async () => 'denied' };
      });
      await expect(provider.getBibliographicData('EP1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('parseJsonBody accepts empty body as empty object', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/search?')) {
          return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
        }
        return mockTextResponse('', 200);
      });
      await expect(provider.searchPublishedData('X')).resolves.toEqual([]);
    });

    it('resolvePublicationNumber returns EP-prefixed number when already EP', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('not found', 404);
      });
      await expect(provider.resolvePublicationNumber('EP9000000')).resolves.toBe(
        'EP9000000',
      );
    });

    it('mergePdfBuffers merges three single-page PDFs', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) return sampleImagesInquiry(3);
        throw new Error(url);
      });
      const doc = await provider.getDocument('EP3000000.A1');
      expect(doc.pageCount).toBe(3);
      expect(doc.buffer.length).toBeGreaterThan(0);
    });

    it('partial credentials leave provider unconfigured', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'only-key';
        return undefined;
      });
      secrets.getSecretValue.mockResolvedValue(null);
      await provider.refreshCredentials();
      expect(provider.isConfigured()).toBe(false);
      expect(provider.getCredentialSource()).toBe('none');
    });

    it('mixed db/env credentials use env when db incomplete', async () => {
      secrets.getSecretValue
        .mockResolvedValueOnce('db-key-only')
        .mockResolvedValueOnce(null);
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'env-key';
        if (key === 'EPO_CONSUMER_SECRET') return 'env-secret';
        return undefined;
      });
      await provider.refreshCredentials();
      expect(provider.getCredentialSource()).toBe('env');
    });

    it('partial db/env mix sets credentialSource none when incomplete', async () => {
      secrets.getSecretValue.mockResolvedValue(null);
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_SECRET') return 'env-secret-only';
        return undefined;
      });
      await provider.refreshCredentials();
      expect(provider.isConfigured()).toBe(false);
      expect(provider.getCredentialSource()).toBe('none');
    });
  });

  describe('deeper OPS JSON and edge branches', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'EPO_CONSUMER_KEY') return 'k';
        if (key === 'EPO_CONSUMER_SECRET') return 's';
        if (key === 'EPO_API_BASE_URL') return 'https://env.ops/rest-services/';
        if (key === 'EPO_AUTH_URL') return 'https://env.ops/auth/token';
        return undefined;
      });
      await provider.refreshCredentials();
    });

    it('uses env API and auth URLs when database values are absent', async () => {
      expect(provider.isConfigured()).toBe(true);
      expect(provider.getCredentialSource()).toBe('env');
    });

    it('parseBiblio reads bibliographic-data directly from world root', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) {
          return {
            'ops:world-patent-data': {
              'bibliographic-data': {
                'invention-title': { '@lang': 'en', $: 'Root Biblio' },
                parties: {
                  applicants: {
                    applicant: {
                      'applicant-name': { name: { $: 'Root Applicant' } },
                    },
                  },
                },
                'publication-reference': {
                  'document-id': {
                    country: { $: 'EP' },
                    'doc-number': { $: '8000000' },
                    date: { $: '20240101' },
                  },
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const result = await provider.getBibliographicData('EP8000000');
      expect(result.title).toBe('Root Biblio');
      expect(result.applicant).toBe('Root Applicant');
    });

    it('parseBiblio returns fallback number when publication ref lacks country', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) {
          return {
            'ops:world-patent-data': {
              'exchange-documents': {
                'exchange-document': [
                  {
                    'bibliographic-data': {
                      'invention-title': { $: 'No Pub Ref' },
                      'publication-reference': {
                        'document-id': { date: { $: '20240202' } },
                      },
                    },
                  },
                ],
              },
            },
          };
        }
        throw new Error(url);
      });
      const result = await provider.getBibliographicData('EP8100000');
      expect(result.publicationNumber).toBe('EP8100000');
      expect(result.publicationDate).toBe('2024-02-02');
    });

    it('parseBiblio skips applicants without resolvable names', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) {
          return {
            'ops:world-patent-data': {
              'exchange-documents': {
                'exchange-document': [
                  {
                    'bibliographic-data': {
                      parties: {
                        applicants: {
                          applicant: [{ 'applicant-name': {} }, { name: { $: 'Second' } }],
                        },
                      },
                    },
                  },
                ],
              },
            },
          };
        }
        throw new Error(url);
      });
      const result = await provider.getBibliographicData('EP8200000');
      expect(result.applicant).toBe('Second');
    });

    it('getBibliographicData rethrows ServiceUnavailableException from first attempt', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('rate limited', 429);
      });
      await expect(provider.getBibliographicData('EP8300000')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('getLegalStatus uses docdb format with dot insertion for bare numbers', async () => {
      const calls: string[] = [];
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/legal/')) {
          calls.push(url);
          if (url.includes('/docdb/EP.1234567')) {
            return mockJsonResponse(sampleLegal);
          }
          return mockTextResponse('not found', 404);
        }
        return mockTextResponse('err', 500);
      });
      await provider.getLegalStatus('EP1234567');
      expect(calls.some((u) => u.includes('/docdb/EP.1234567'))).toBe(true);
    });

    it('extractPublicationRef prefers A1 over kind-less refs', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'publication-reference': [
                {
                  'document-id': [
                    {
                      country: { $: 'EP' },
                      'doc-number': { $: '9000001' },
                    },
                    {
                      country: { $: 'EP' },
                      'doc-number': { $: '9000001' },
                      kind: { $: 'A1' },
                    },
                  ],
                },
              ],
              'ops:legal': [{ '@code': '17P', 'ops:L007EP': { $: '20210101' } }],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9000001');
      expect(status.publicationRef?.kind).toBe('A1');
    });

    it('extractApplicationRef reads doc-id attribute variant', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'application-reference': [
                {
                  '@docId': '112233445',
                  'document-id': [{ 'doc-number': { $: '11223344' } }],
                },
              ],
              'ops:legal': [{ '@code': '17P', 'ops:L007EP': { $: '20210101' } }],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP112233445');
      expect(status.applicationRef?.checkDigit).toBe('5');
    });

    it('parseLegalEvents uses $ description and date fields', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              legal: [
                {
                  code: 'X1',
                  date: { $: '20230303' },
                  $: 'Plain description text',
                },
              ],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9200000');
      expect(status.events[0]?.description).toBe('Plain description text');
      expect(status.events[0]?.date).toBe('2023-03-03');
    });

    it('classifies 17W code as refusal', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [
                {
                  '@code': '17W',
                  'ops:L007EP': { $: '20230404' },
                  '@desc': 'Withdrawn',
                },
              ],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9300000');
      expect(status.events[0]?.kind).toBe('refusal');
    });

    it('parseImagesInquiry reads ops:document-link and @document-name desc', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) {
          return {
            'ops:world-patent-data': {
              'document-inquiry': {
                'inquiry-result': {
                  'document-instance': [
                    {
                      'ops:document-link': { '@link': '/published-data/publication/epodoc/EP9400000.A1/images/fullimage' },
                      '@pages': '1',
                      '@document-name': 'FullImage',
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const doc = await provider.getDocument('EP9400000');
      expect(doc.imagePath).toContain('fullimage');
    });

    it('parseImagesInquiry skips instances without link and returns null', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images')) {
          return mockJsonResponse({
            'ops:world-patent-data': {
              'ops:document-inquiry': {
                'ops:inquiry-result': {
                  'ops:document-instance': [{ '@desc': 'No link' }],
                },
              },
            },
          });
        }
        return mockTextResponse('not found', 404);
      });
      await expect(provider.getDocument('EP9500000')).rejects.toBeInstanceOf(
        EpoDocumentNotAvailableError,
      );
    });

    it('inquireImages rethrows EpoDocumentNotAvailableError when last error matches', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('Patent not found in EPO OPS', 404);
      });
      await expect(provider.getDocument('EP9600000')).rejects.toBeInstanceOf(
        EpoDocumentNotAvailableError,
      );
    });

    it('fetchImagePage throws auth error after retry still fails', async () => {
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        if (url.includes('/images') && !url.includes('.pdf?Range=')) {
          return mockJsonResponse(sampleImagesInquiry(1));
        }
        if (init?.method === 'GET' && url.includes('.pdf?Range=')) {
          return { ok: false, status: 403, text: async () => 'denied' };
        }
        return mockTextResponse('err', 500);
      });
      await expect(provider.getDocument('EP9700000')).rejects.toBeInstanceOf(
        EpoDocumentAuthError,
      );
    });

    it('opsGetJson logs and parses large JSON bodies', async () => {
      const bigPayload = { data: 'x'.repeat(9000) };
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse(JSON.stringify(bigPayload), 200);
      });
      await expect(provider.searchPublishedData('big')).resolves.toEqual([]);
    });

    it('formatOpsDate returns raw when not 8 digits', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [
                {
                  '@code': '17P',
                  'ops:L007EP': { $: '2020-06-15' },
                  '@desc': 'Examination',
                },
              ],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9800000');
      expect(status.events[0]?.date).toBe('2020-06-15');
    });

    it('searchPublishedData includes hits without kind code', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/search?')) {
          return {
            'ops:world-patent-data': {
              'ops:biblio-search': {
                'ops:search-result': {
                  'ops:publication-reference': [
                    {
                      'document-id': [
                        {
                          country: { $: 'EP' },
                          'doc-number': { $: '9900000' },
                          date: { $: '20240505' },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const hits = await provider.searchPublishedData('NoKind');
      expect(hits[0]?.publicationNumber).toBe('EP9900000');
      expect(hits[0]?.publicationDate).toBe('2024-05-05');
    });

    it('resolvePublicationNumber uses legal publicationNumber when ref missing', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [{ '@code': '17P', 'ops:L007EP': { $: '20210101' } }],
            },
          };
        }
        throw new Error(url);
      });
      await expect(provider.resolvePublicationNumber('EP9911111')).resolves.toBe(
        'EP9911111',
      );
    });

    it('getLegalStatus rethrows ServiceUnavailableException from attempt', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (isEpoAuthUrl(url)) {
          return mockJsonResponse({ access_token: 't', expires_in: 3600 });
        }
        return mockTextResponse('rate limited', 429);
      });
      await expect(provider.getLegalStatus('EP9922222')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('parseImagesInquiry strips rest-services prefix and file extension from link', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/images')) {
          return {
            'ops:world-patent-data': {
              'ops:document-inquiry': {
                'ops:inquiry-result': {
                  'ops:document-instance': [
                    {
                      '@link': 'rest-services/3.2/published-data/publication/epodoc/EP9933333.A1/images/scan.tiff',
                      '@number-of-pages': '0',
                      '@desc': 'FullImage scan',
                    },
                  ],
                },
              },
            },
          };
        }
        throw new Error(url);
      });
      const doc = await provider.getDocument('EP9933333.A1');
      expect(doc.imagePath).not.toMatch(/\.tiff$/i);
      expect(doc.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('classifies search report descriptions as office_action', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [
                {
                  code: 'UNK',
                  date: { $: '20240101' },
                  description: 'International search report issued',
                },
              ],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9944444');
      expect(status.events[0]?.kind).toBe('office_action');
    });

    it('extractPublicationRef returns null when no publication refs exist', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [{ '@code': '17P', 'ops:L007EP': { $: '20210101' } }],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9955555');
      expect(status.publicationRef).toBeNull();
    });

    it('parseLegalEvents keeps nodes with top-level code despite nested events', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/legal/')) {
          return {
            'ops:world-patent-data': {
              'ops:legal': [
                {
                  '@code': '17P',
                  'legal-event': [
                    {
                      '@code': 'B1',
                      'ops:L007EP': { $: '20220101' },
                    },
                  ],
                },
              ],
            },
          };
        }
        throw new Error(url);
      });
      const status = await provider.getLegalStatus('EP9966666');
      expect(status.events.some((e) => e.code === '17P')).toBe(true);
    });

    it('getBibliographicData returns sparse biblio without title or applicant', async () => {
      mockTokenAndOps((url) => {
        if (url.includes('/biblio')) {
          return {
            'ops:world-patent-data': {
              'exchange-documents': {
                'exchange-document': [{ 'bibliographic-data': {} }],
              },
            },
          };
        }
        throw new Error(url);
      });
      const result = await provider.getBibliographicData('EP9977777');
      expect(result.publicationNumber).toBe('EP9977777');
      expect(result.title).toBeNull();
      expect(result.applicant).toBeNull();
    });
  });
});
