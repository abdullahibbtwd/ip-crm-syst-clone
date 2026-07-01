export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  clientId?: string | null;
  type?: 'access' | 'mfa_pending';
}

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
}

export type LoginResult =
  | { mfaRequired: true; pendingUserId: string }
  | { mfaRequired: false; user: PublicUser };

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  clientId: string | null;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
