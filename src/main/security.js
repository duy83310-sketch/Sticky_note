const crypto = require('crypto');

/**
 * Module bảo mật & mã hóa cho Sticky Notes
 * Chuẩn AES-256-GCM + PBKDF2
 */

const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 100000;
const KEY_LEN = 32;
const DIGEST = 'sha256';

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPin(pin, salt) {
  if (!pin) return null;
  const derivedKey = crypto.pbkdf2Sync(String(pin), salt, ITERATIONS, KEY_LEN, DIGEST);
  return derivedKey.toString('hex');
}

function verifyPin(pin, storedHash, salt) {
  if (!pin || !storedHash || !salt) return false;
  const hashToTest = hashPin(pin, salt);
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(hashToTest, 'hex'));
}

function encryptText(plainText, pin) {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.pbkdf2Sync(String(pin), salt, ITERATIONS, KEY_LEN, DIGEST);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (err) {
    console.error('Lỗi mã hóa:', err);
    throw new Error('Mã hóa thất bại');
  }
}

function decryptText(cipherObj, pin) {
  try {
    if (!cipherObj || !cipherObj.encryptedData) return '';
    const salt = Buffer.from(cipherObj.salt, 'hex');
    const iv = Buffer.from(cipherObj.iv, 'hex');
    const authTag = Buffer.from(cipherObj.authTag, 'hex');
    const key = crypto.pbkdf2Sync(String(pin), salt, ITERATIONS, KEY_LEN, DIGEST);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherObj.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Lỗi giải mã:', err);
    throw new Error('Sai mã PIN hoặc dữ liệu bị thay đổi');
  }
}

module.exports = {
  generateSalt,
  hashPin,
  verifyPin,
  encryptText,
  decryptText,
};
