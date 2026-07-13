import { Injectable } from '@nestjs/common';
import { EpoProvider } from './providers/epo.provider';

export type EpoTestResult =
  | {
      success: true;
      patent: {
        title: string | null;
        applicant: string | null;
        publicationDate: string | null;
        publicationNumber: string;
      };
    }
  | {
      success: false;
      error: string;
    };

@Injectable()
export class RegistryService {
  constructor(private readonly epo: EpoProvider) {}

  async getEpoStatus() {
    await this.epo.refreshCredentials();
    return {
      provider: 'epo' as const,
      configured: this.epo.isConfigured(),
      source: this.epo.getCredentialSource(),
    };
  }

  async testEpoConnection(patentNumber?: string): Promise<EpoTestResult> {
    const number = (patentNumber?.trim() || 'EP3000000').toUpperCase();

    await this.epo.refreshCredentials();

    if (!this.epo.isConfigured()) {
      return {
        success: false,
        error:
          'EPO is not configured. Add credentials under Settings → Integrations (or set EPO_CONSUMER_KEY / EPO_CONSUMER_SECRET in .env).',
      };
    }

    try {
      const patent = await this.epo.getBibliographicData(number);
      return {
        success: true,
        patent: {
          title: patent.title,
          applicant: patent.applicant,
          publicationDate: patent.publicationDate,
          publicationNumber: patent.publicationNumber,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Invalid credentials or rate limit',
      };
    }
  }
}
