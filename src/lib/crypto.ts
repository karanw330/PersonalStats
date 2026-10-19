import type { DashboardData } from '../types';

export type Sealed = { v: 1; alg: 'AES-256-GCM'; kdf: 'PBKDF2-SHA256'; iterations: number; salt: string; nonce: string; ciphertext: string };
const DEFAULT_ITERATIONS = 310_000;
const toBytes = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const toBase64 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return btoa(s);
};
async function makeKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const imported = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, imported,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function sealObject(value: unknown, passphrase: string): Promise<Sealed> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await makeKey(passphrase, salt, DEFAULT_ITERATIONS);
  const raw = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, raw);
  return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: DEFAULT_ITERATIONS,
    salt: toBase64(salt), nonce: toBase64(nonce), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}
export async function unsealObject<T = DashboardData>(sealed: Sealed, passphrase: string): Promise<T> {
  if (sealed.v !== 1 || sealed.alg !== 'AES-256-GCM' || sealed.kdf !== 'PBKDF2-SHA256' || sealed.iterations < 100_000) {
    throw new Error('Unsupported encrypted data format');
  }
  const key = await makeKey(passphrase, toBytes(sealed.salt), sealed.iterations);
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBytes(sealed.nonce) }, key, toBytes(sealed.ciphertext));
  return JSON.parse(new TextDecoder().decode(raw)) as T;
}
export async function loadDashboard(passphrase: string): Promise<DashboardData> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/dashboard.enc.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error('Encrypted dashboard not deployed yet. See README setup steps.');
  return unsealObject<DashboardData>(await r.json() as Sealed, passphrase);
}
export async function loadLocalMilestones(passphrase: string): Promise<Record<string, boolean> | null> {
  const json = localStorage.getItem('devpulse-milestone-overrides-v1');
  if (!json) return null;
  try { return await unsealObject<Record<string, boolean>>(JSON.parse(json) as Sealed, passphrase); }
  catch { return null; }
}
export async function saveLocalMilestones(overrides: Record<string, boolean>, passphrase: string) {
  localStorage.setItem('devpulse-milestone-overrides-v1', JSON.stringify(await sealObject(overrides, passphrase)));
}
