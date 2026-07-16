import { RegistryService } from './registry.service';
import type { EpoProvider } from './providers/epo.provider';

describe('RegistryService', () => {
  let service: RegistryService;
  let epo: {
    refreshCredentials: jest.Mock;
    isConfigured: jest.Mock;
    getCredentialSource: jest.Mock;
    getBibliographicData: jest.Mock;
  };

  beforeEach(() => {
    epo = {
      refreshCredentials: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn(),
      getCredentialSource: jest.fn().mockReturnValue('db'),
      getBibliographicData: jest.fn(),
    };
    service = new RegistryService(epo as unknown as EpoProvider);
  });

  it('getEpoStatus reports configuration', async () => {
    epo.isConfigured.mockReturnValue(true);
    await expect(service.getEpoStatus()).resolves.toEqual({
      provider: 'epo',
      configured: true,
      source: 'db',
    });
  });

  it('testEpoConnection fails when not configured', async () => {
    epo.isConfigured.mockReturnValue(false);
    await expect(service.testEpoConnection()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('not configured'),
    });
  });

  it('testEpoConnection maps bibliographic data', async () => {
    epo.isConfigured.mockReturnValue(true);
    epo.getBibliographicData.mockResolvedValue({
      title: 'Widget',
      applicant: 'Acme',
      publicationDate: '2020-01-01',
      publicationNumber: 'EP3000000',
    });

    await expect(service.testEpoConnection('ep3000000')).resolves.toEqual({
      success: true,
      patent: {
        title: 'Widget',
        applicant: 'Acme',
        publicationDate: '2020-01-01',
        publicationNumber: 'EP3000000',
      },
    });
    expect(epo.getBibliographicData).toHaveBeenCalledWith('EP3000000');
  });

  it('testEpoConnection returns provider errors', async () => {
    epo.isConfigured.mockReturnValue(true);
    epo.getBibliographicData.mockRejectedValue(new Error('rate limited'));
    await expect(service.testEpoConnection()).resolves.toEqual({
      success: false,
      error: 'rate limited',
    });
  });
});
