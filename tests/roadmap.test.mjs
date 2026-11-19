import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRoadmap, readRoadmap } from '../scripts/roadmap.mjs';

test('billing roadmap preserves all completed foundations and phases', async () => {
  const markdown = await readFile(new URL('../docs/billing-pipeline-milestones.md', import.meta.url), 'utf8');
  const phases = parseRoadmap(markdown);
  assert.deepEqual(phases.map(p => p.milestones.length), [8,6,7,6,4,4]);
  assert.deepEqual(phases.map(p => p.milestones.filter(m => m.done).length), [8,2,0,0,0,0]);
  const all = phases.flatMap(p => p.milestones);
  assert.equal(all.length, 35);
  assert.equal(new Set(all.map(m=>m.id)).size, 35);
  assert.deepEqual(all.map(m=>m.id).slice(0,8), Array.from({length:8},(_,i)=>'F'+(i+1)));
  assert.equal(all.find(m=>m.id==='M1.3')?.done, false);
  assert.match(all.find(m=>m.id==='F6')?.description || '', /DefaultErrorHandler/);
  assert.match(all.find(m=>m.id==='M2.4')?.description || '', /Duplicate events must not change balances/);
  assert.deepEqual(await readRoadmap(), phases);
});
