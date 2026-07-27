export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  clientId?: string | null;
  type?: 'access' | 'mfa_pending';
  mfaEnrollmentRequired?: boolean;
}

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
}

export type LoginResult =
  | {
      mfaRequired: true;
      pendingUserId: string;
      pendingMethod?: 'password' | 'sso';
    }
  | {
      mfaRequired: false;
      user: PublicUser;
      tokens: TokenPair;
      mfaEnrollmentRequired?: boolean;
    };

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  clientId: string | null;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  mfaEnrollmentRequired?: boolean;
  preferredLocale: string | null;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
