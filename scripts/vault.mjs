import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
export const ITERATIONS = 310_000;
export function seal(value, password) {
  if (password.length < 12) throw new Error('Passphrase must be at least 12 characters. A long, unique passphrase is strongly recommended.');
  const salt = randomBytes(16), nonce = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
    salt: salt.toString('base64'), nonce: nonce.toString('base64'), ciphertext: body.toString('base64') };
}
export function unseal(payload, password) {
  if (payload.v !== 1 || payload.alg !== 'AES-256-GCM' || payload.kdf !== 'PBKDF2-SHA256' || !Number.isSafeInteger(payload.iterations) || payload.iterations < 100_000 || payload.iterations > 2_000_000) throw new Error('Unrecognized encrypted payload');
  const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), payload.iterations, 32, 'sha256');
  const bytes = Buffer.from(payload.ciphertext, 'base64');
  const iv = Buffer.from(payload.nonce, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(bytes.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0,-16)), decipher.final()]).toString('utf8'));
}
