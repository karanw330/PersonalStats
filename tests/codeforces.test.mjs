import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllCodeforcesSubmissions, summarizeCodeforcesSolves } from '../scripts/codeforces.mjs';

test('counts each distinct accepted problem once, including unrated problems', () => {
  const stats = summarizeCodeforcesSolves([
    { verdict: 'OK', problem: { contestId: 100, index: 'A', rating: 800 } },
    { verdict: 'OK', problem: { contestId: 100, index: 'A', rating: 800 } },
    { verdict: 'WRONG_ANSWER', problem: { contestId: 100, index: 'B', rating: 900 } },
    { verdict: 'OK', problem: { contestId: 100, index: 'C' } },
  ]);
  assert.equal(stats.solved, 2);
  assert.deepEqual(stats.difficulty, { '800': 1 });
});

test('counts distinct accepted problems even if contestId is unavailable', () => {
  const stats = summarizeCodeforcesSolves([
    { verdict: 'OK', problem: { name: 'Gym A', index: 'A' } },
    { verdict: 'OK', problem: { name: 'Gym B', index: 'B' } },
    { verdict: 'OK', problem: { name: 'Gym A', index: 'A' } },
  ]);
  assert.equal(stats.solved, 2);
});

test('paginates all submission history instead of stopping at a fixed 2,000', async () => {
  const calls = [];
  const results = [
    [{ verdict: 'OK', problem: { contestId: 1, index: 'A' } }, { verdict: 'OK', problem: { contestId: 2, index: 'A' } }],
    [{ verdict: 'OK', problem: { contestId: 3, index: 'A' } }],
  ];
  const { submissions, pages } = await fetchAllCodeforcesSubmissions(async (from, count) => {
    calls.push([from, count]);
    return { status: 'OK', result: results.shift() };
  }, { pageSize: 2 });
  assert.deepEqual(calls, [[1, 2], [3, 2]]);
  assert.equal(pages, 2);
  assert.equal(summarizeCodeforcesSolves(submissions).solved, 3);
});

test('a failed page never publishes a partial solved count', async () => {
  await assert.rejects(
    fetchAllCodeforcesSubmissions(async from => from === 1
      ? { status: 'OK', result: [{ verdict: 'OK' }] }
      : { status: 'FAILED' }, { pageSize: 1 }),
    /unavailable or malformed/,
  );
});

test('stops rather than publishing partial results at the safety limit', async () => {
  await assert.rejects(fetchAllCodeforcesSubmissions(async () => ({
    status: 'OK', result: [{ verdict: 'OK' }],
  }), { pageSize: 1, maxPages: 2 }), /pagination safety limit/);
});
