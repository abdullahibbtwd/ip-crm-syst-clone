import { Injectable } from '@nestjs/common';
import {
  MFA_POLICY_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants';
import { SystemSecretsService } from '../secrets/system-secrets.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { UserWithAccess } from './user-access';

@Injectable()
export class MfaPolicyService {
  constructor(private readonly secrets: SystemSecretsService) {}

  isInternalUser(user: UserWithAccess): boolean {
    const roles = user.userRoles.map((entry) => entry.role.name);
    return !roles.includes(SYSTEM_ROLES.PORTAL_CLIENT);
  }

  async isPolicyRequiredForInternal(): Promise<boolean> {
    const value = await this.secrets.getNonSecretValue(
      SYSTEM_SECRET_CATEGORY.MFA_POLICY,
      MFA_POLICY_KEYS.REQUIRE_INTERNAL,
    );
    return value === 'true';
  }

  async requiresMfaEnrollment(user: UserWithAccess): Promise<boolean> {
    if (!this.isInternalUser(user) || user.mfaEnabled) {
      return false;
    }
    return this.isPolicyRequiredForInternal();
  }
}
