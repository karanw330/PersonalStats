import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eraseLegacyResumeStorage } from '../src/lib/legacy-resume-cleanup.ts';

test('deletes only the retired resume database', async () => {
 const removed=[];
 globalThis.indexedDB={deleteDatabase(name){
  removed.push(name);
  const request={};
  queueMicrotask(()=>request.onsuccess());
  return request;
 }};
 assert.equal(await eraseLegacyResumeStorage(),'removed');
 assert.deepEqual(removed,['devpulse-resume-v1']);
});

test('reports blocked deletions so the user can close other tabs', async () => {
 globalThis.indexedDB={deleteDatabase(){
  const request={};
  queueMicrotask(()=>request.onblocked());
  return request;
 }};
 assert.equal(await eraseLegacyResumeStorage(),'blocked');
});

test('reports failures without changing other browser data', async () => {
 globalThis.indexedDB={deleteDatabase(){throw new Error('Denied')}};
 assert.equal(await eraseLegacyResumeStorage(),'error');
});

test('handles storage APIs being absent', async () => {
 delete globalThis.indexedDB;
 assert.equal(await eraseLegacyResumeStorage(),'unsupported');
});

test('deduplicates simultaneous deletion requests', async () => {
 let callCount=0;
 globalThis.indexedDB={deleteDatabase(){
  callCount++;
  const request={};
  queueMicrotask(()=>request.onsuccess());
  return request;
 }};
 const [a,b]=await Promise.all([eraseLegacyResumeStorage(),eraseLegacyResumeStorage()]);
 assert.equal(a,'removed');
 assert.equal(b,'removed');
 assert.equal(callCount,1);
});
