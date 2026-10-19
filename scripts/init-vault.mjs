import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { seal } from './vault.mjs';
const passphrase = process.env.DEVPULSE_PASSPHRASE;
if (!passphrase) { console.error('Set DEVPULSE_PASSPHRASE in your shell (do not place it in code or commit it).'); process.exit(1); }
const markdown = await readFile(new URL('../private/billing-milestones.md', import.meta.url), 'utf8').catch(() => null);
if (!markdown) { console.error('Put the AWS milestone Markdown in private/billing-milestones.md (gitignored).'); process.exit(1); }
const headers = [...markdown.matchAll(/^## Phase (\d+) — (.+)$/gm)];
const phases = headers.map((h, i) => {
  const content = markdown.slice(h.index + h[0].length, i + 1 < headers.length ? headers[i+1].index : markdown.indexOf('## Two decisions'));
  const milestones = [...content.matchAll(/^- \[([x ])\] \*\*(M\d+\.\d+)(?: — ([^*]+))?\*\*([^\n]*(?:\n(?!- \[|\*\*Exit criteria|## ).*)*)/gm)].map(m => ({
    id:m[2], title:(m[3] || m[4] || '').replace(/`/g,'').replace(/\s+/g,' ').replace(/\.$/,'').trim().slice(0,74),
    description: [m[3],m[4]].filter(Boolean).join(' ').replace(/\s+/g,' ').replace(/`/g,'').trim(), done:m[1]==='x'
  }));
  // Support cross-line text of milestones without relying on the Markdown formatting of a specific file.
  if (!milestones.length) throw new Error('Missing milestones for phase '+h[1]);
  const exitCriteria = content.match(/\*\*Exit criteria:\*\*([^\n]*(?:\n(?!\n).*)*)/)?.[1]?.replace(/\s+/g,' ').trim() || '';
  return {id:Number(h[1]), title:h[2].trim(), subtitle:['Foundations','Framework','Streaming','Idempotency','Durability','Parallelism','Reliability'][i] || '', exitCriteria, milestones};
});
if (phases.length !== 7 || phases.some(p=>!p.milestones.length)) throw new Error('Expected seven phases and at least one milestone each');
const conf = { phases, backlog: [
  {title:'Next Permutation', topic:'Arrays', priority:'High'},
  {title:'Reverse Pairs', topic:'Merge sort', priority:'High'},
  {title:'Maximum Product Subarray', topic:'Dynamic programming', priority:'Medium'},
  {title:'Search in Rotated Sorted Array', topic:'Binary search', priority:'High'}
], goals:{ leetcodeTarget:100, targetDate:'2026-12-31' } };
await mkdir(new URL('../private/',import.meta.url),{recursive:true});
const path = new URL('../private/config.enc.json',import.meta.url);
try { await access(path); if (process.env.DEVPULSE_FORCE !== '1') throw new Error('Config exists. To replace it, set DEVPULSE_FORCE=1 (old encrypted overrides cannot be recovered from the replaced file).'); } catch(e) {if (e.code !== 'ENOENT') throw e;}
await writeFile(path,JSON.stringify(seal(conf,passphrase),null,2)+'\n');
console.log(`Encrypted ${phases.length} AWS phases and ${phases.reduce((s,p)=>s+p.milestones.length,0)} milestones in private/config.enc.json.`);
console.log('Only commit private/config.enc.json. The raw Markdown is gitignored.');
