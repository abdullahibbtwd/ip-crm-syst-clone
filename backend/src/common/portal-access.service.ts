import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';

/**
 * Central place for portal-client data isolation. Portal users (role
 * `portal_client`) may only ever read data that belongs to their own client
 * record. Internal staff are unaffected.
 */
@Injectable()
export class PortalAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isPortalClient(user: AuthenticatedUser): boolean {
    return user.roles.includes(SYSTEM_ROLES.PORTAL_CLIENT);
  }

  /**
   * The client id a query must be scoped to, or `null` when the user should
   * see everything (internal staff). Throws if a portal account is not linked
   * to a client (misconfigured account).
   */
  requireScopeClientId(user: AuthenticatedUser): string | null {
    if (!this.isPortalClient(user)) return null;
    if (!user.clientId) {
      throw new ForbiddenException('Portal account is not linked to a client');
    }
    return user.clientId;
  }

  /**
   * Ensure a portal client can only reach matters owned by their client.
   * Returns the same 403 whether the matter is missing or simply not theirs,
   * so existence is not leaked. No-op for internal staff.
   */
  async assertMatterAccess(
    matterId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const scopeClientId = this.requireScopeClientId(user);
    if (!scopeClientId) return;

    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { clientId: true },
    });

    if (!matter || matter.clientId !== scopeClientId) {
      throw new ForbiddenException('You do not have access to this matter');
    }
  }

  /**
   * Ensure a portal client can only reach a document (by id) that belongs to
   * one of their client's matters. No-op for internal staff.
   */
  async assertDocumentAccess(
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const scopeClientId = this.requireScopeClientId(user);
    if (!scopeClientId) return;

    const document = await this.prisma.matterDocument.findUnique({
      where: { id: documentId },
      select: { matter: { select: { clientId: true } } },
    });

    if (!document || document.matter.clientId !== scopeClientId) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }
}
