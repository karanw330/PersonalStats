import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { sealObject, unsealObject, type Sealed } from './crypto';

GlobalWorkerOptions.workerSrc = workerSrc;
export type StoredResume = { name: string; base64: string; text: string; previousText: string | null; modified: string; pages: number };
const DB = 'devpulse-resume-v1';
function dbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('vault');
    request.onerror = () => rej(request.error);
    request.onsuccess = () => res(request.result);
  });
}
async function idbRead(): Promise<Sealed | null> {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('vault', 'readonly');
    const r = tx.objectStore('vault').get('resume');
    r.onsuccess = () => { db.close(); res(r.result ?? null); };
    r.onerror = () => { db.close(); rej(r.error); };
  });
}
async function idbWrite(value: Sealed): Promise<void> {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('vault', 'readwrite');
    tx.objectStore('vault').put(value, 'resume');
    tx.oncomplete = () => { db.close(); res(); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
export async function loadResume(passphrase: string): Promise<StoredResume | null> {
  const sealed = await idbRead();
  if (!sealed) return null;
  try { return await unsealObject<StoredResume>(sealed, passphrase); }
  catch { return null; }
}
export async function saveResume(resume: StoredResume, passphrase: string) {
  await idbWrite(await sealObject(resume, passphrase));
}
export async function extractResume(file: File, old: StoredResume | null): Promise<StoredResume> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Only PDFs are supported');
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose a PDF smaller than 10 MB');
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await getDocument({ data: bytes.slice() }).promise;
  const sections: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    // Text-only extraction: scanned image PDFs may require OCR outside this MVP.
    sections.push(content.items.map(item => ('str' in item ? String(item.str) : '')).join(' '));
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { name: file.name, base64: btoa(binary), text: sections.join('\n'),
    previousText: old?.text ?? null, modified: new Date().toISOString(), pages: pdf.numPages };
}
export function resumeBlobUrl(resume: StoredResume): string {
  const binary = atob(resume.base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}
export function diffResume(resume: StoredResume) {
  const split = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9.+#-]{3,}/g) || []);
  if (!resume.previousText) return { added: [] as string[], removed: [] as string[] };
  const older = split(resume.previousText); const newer = split(resume.text);
  return { added: [...newer].filter(t => !older.has(t)).slice(0, 20),
    removed: [...older].filter(t => !newer.has(t)).slice(0, 20) };
}
