module.exports = {
  verify: () => false,
  generateSecret: () => 'secret',
  generateURI: () => 'otpauth://totp/test',
};
