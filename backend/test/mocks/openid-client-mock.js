/** Minimal CJS stub for ESM-only openid-client (e2e boot). */
module.exports = {
  discovery: async () => ({}),
  buildAuthorizationUrl: () => new URL('https://example.test/oauth/authorize'),
  authorizationCodeGrant: async () => ({}),
  fetchUserInfo: async () => ({}),
  calculatePKCECodeChallenge: async () => 'challenge',
  randomPKCECodeVerifier: () => 'verifier',
  randomState: () => 'state',
  ClientSecretPost: class ClientSecretPost {},
};
