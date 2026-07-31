import { ClientType } from '../../generated/prisma/client';
import {
  isIntakePartyProvided,
  type IntakePartyDto,
} from './dto/intake-party.dto';
import {
  packIntakeParty,
  readIntakeParty,
  resolveMatterParties,
} from './intake-party.util';

describe('intake-party.util', () => {
  describe('isIntakePartyProvided / packIntakeParty', () => {
    it('treats empty party as omitted', () => {
      expect(isIntakePartyProvided(undefined)).toBe(false);
      expect(isIntakePartyProvided({})).toBe(false);
      expect(packIntakeParty(undefined)).toBeUndefined();
    });

    it('packs existing client link', () => {
      expect(
        packIntakeParty({ existingClientId: '  c1  ' } as IntakePartyDto),
      ).toEqual({ existingClientId: 'c1' });
    });

    it('packs create-lite company', () => {
      expect(
        packIntakeParty({
          type: ClientType.company,
          companyName: ' Apple Inc. ',
          country: 'us',
        }),
      ).toEqual({
        type: ClientType.company,
        companyName: 'Apple Inc.',
        fullName: undefined,
        country: 'US',
      });
    });
  });

  describe('readIntakeParty', () => {
    it('returns null for invalid json', () => {
      expect(readIntakeParty(null)).toBeNull();
      expect(readIntakeParty('x')).toBeNull();
    });

    it('returns object payload', () => {
      expect(readIntakeParty({ existingClientId: 'c2' })).toEqual({
        existingClientId: 'c2',
      });
    });
  });

  describe('resolveMatterParties', () => {
    const clientsService = {
      createInTransaction: jest.fn(),
    };

    beforeEach(() => {
      clientsService.createInTransaction.mockReset();
    });

    it('defaults owner to instructing client when applicant omitted', async () => {
      const tx = {
        client: { findUnique: jest.fn() },
      };

      const result = await resolveMatterParties(
        tx as never,
        clientsService as never,
        'client-instructing',
        null,
        null,
      );

      expect(result).toEqual({
        applicantClientId: null,
        intermediaryClientId: null,
        ownerClientId: 'client-instructing',
      });
      expect(clientsService.createInTransaction).not.toHaveBeenCalled();
    });

    it('resolves distinct applicant via existingClientId', async () => {
      const tx = {
        client: {
          findUnique: jest.fn().mockResolvedValue({ id: 'apple' }),
        },
      };

      const result = await resolveMatterParties(
        tx as never,
        clientsService as never,
        'law-firm',
        { existingClientId: 'apple' },
        null,
      );

      expect(result).toEqual({
        applicantClientId: 'apple',
        intermediaryClientId: null,
        ownerClientId: 'apple',
      });
    });

    it('creates applicant client on convert and keeps instructing distinct', async () => {
      const tx = {
        client: { findUnique: jest.fn() },
      };
      clientsService.createInTransaction.mockResolvedValue({ id: 'new-apple' });

      const result = await resolveMatterParties(
        tx as never,
        clientsService as never,
        'law-firm',
        {
          type: ClientType.company,
          companyName: 'Apple Inc.',
          country: 'US',
        },
        null,
      );

      expect(clientsService.createInTransaction).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          type: ClientType.company,
          companyName: 'Apple Inc.',
          gdprConsent: true,
        }),
      );
      expect(result.applicantClientId).toBe('new-apple');
      expect(result.ownerClientId).toBe('new-apple');
    });

    it('collapses applicant to null when same as instructing client', async () => {
      const tx = {
        client: {
          findUnique: jest.fn().mockResolvedValue({ id: 'same' }),
        },
      };

      const result = await resolveMatterParties(
        tx as never,
        clientsService as never,
        'same',
        { existingClientId: 'same' },
        null,
      );

      expect(result.applicantClientId).toBeNull();
      expect(result.ownerClientId).toBe('same');
    });
  });
});
