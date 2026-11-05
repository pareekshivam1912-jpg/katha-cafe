import crypto from 'node:crypto';

const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, expectedHashHex] = parts;
  const expectedBuffer = Buffer.from(expectedHashHex, 'hex');

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, KEY_LEN, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const matches = crypto.timingSafeEqual(derivedKey, expectedBuffer);
        resolve(matches);
      } catch {
        resolve(false);
      }
    });
  });
}
