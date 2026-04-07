const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue) {
    return false;
  }

  if (!storedValue.startsWith(`${HASH_PREFIX}$`)) {
    return String(password) === String(storedValue);
  }

  const [, salt, expectedKey] = storedValue.split('$');
  const derivedKey = crypto.scryptSync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expectedKey, 'hex');

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, expectedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword
};
