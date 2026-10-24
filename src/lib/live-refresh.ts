import type { CF, DashboardData, Github, LC } from '../types';
import { loadDashboard } from './crypto';

type RefreshReport = { data: DashboardData; refreshed: string[]; errors: Record<string, string>; snapshotChanged: boolean };
const numeric = (value: unknown): number | null => {
 const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
 return Number.isFinite(n) ? n : null;
};
const asObject = (value: unknown): Record<string, any> =>
 value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getJSON(url: string, timeoutMs = 25000): Promise<any> {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), timeoutMs);
 try {
  // no credentials or private API tokens are sent to third-party services
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const value = await response.json();
  if (value?.status === 'FAILED') throw new Error(value.comment || 'API returned FAILED');
  return value;
 } finally { clearTimeout(timeout); }
}
function calendarFrom(raw: unknown): Record<string, number> {
 const calendar: Record<string, number> = {};
 try {
  const input = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const obj = asObject(input);
  for (const [key, value] of Object.entries(obj)) {
   const day = /^\d+$/.test(key) ? new Date(Number(key) * 1000).toISOString().slice(0, 10) : key.slice(0, 10);
   const count = numeric(value);
   if (/^\d{4}-\d\d-\d\d$/.test(day) && count !== null && count >= 0) calendar[day] = count;
  }
 } catch { /* Some profiles have no public calendar. */ }
 return calendar;
}
function acceptedSubmissions(raw: unknown): LC['recent'] {
 const entries = Array.isArray(raw) ? raw : asArray(asObject(raw).submission ?? asObject(raw).recentAcSubmissionList ?? asObject(raw).submissions);
 return entries.filter(entry => !entry.statusDisplay || entry.statusDisplay === 'Accepted')
  .slice(0, 15).map(entry => ({
   title: String(entry.title || entry.titleSlug || 'Problem'),
   status: 'Accepted',
   date: entry.timestamp ? new Date(Number(entry.timestamp) * 1000).toISOString() : String(entry.date || '')
  }));
}
async function refreshLeetCode(old: LC): Promise<LC> {
 // LeetCode's GraphQL API blocks cross-origin browser requests; use the
 // public CORS-enabled alfa API. The scheduled collector still uses official GraphQL.
 const base = 'https://alfa-leetcode-api.onrender.com/' + encodeURIComponent(old.username);
 const s = asObject(await getJSON(base + '/solved', 40000));
 const solved = numeric(s.solvedProblem ?? s.totalSolved ?? s.solved ?? s.totalSolvedNum);
 if (solved === null) throw new Error('LeetCode returned no valid solved count');
 const difficulty = {
  easy: numeric(s.easySolved ?? s.easySolvedCount) ?? old.difficulty.easy,
  medium: numeric(s.mediumSolved ?? s.mediumSolvedCount) ?? old.difficulty.medium,
  hard: numeric(s.hardSolved ?? s.hardSolvedCount) ?? old.difficulty.hard
 };
 const [calResult, recentResult] = await Promise.allSettled([
  getJSON(base + '/calendar', 25000), getJSON(base + '/acSubmission?limit=15', 25000)
 ]);
 const cal = calResult.status === 'fulfilled' ? asObject(calResult.value) : {};
 const calendar = calendarFrom(cal.submissionCalendar ?? cal.calendar ?? cal);
 const recent = recentResult.status === 'fulfilled' ? acceptedSubmissions(recentResult.value) : [];
 return { ...old, solved, totalQuestions: numeric(s.totalQuestions) ?? old.totalQuestions,
  difficulty, calendar: Object.keys(calendar).length ? calendar : old.calendar,
  recent: recent.length ? recent : old.recent };
}
async function refreshCodeforces(old: CF): Promise<CF> {
 const base = 'https://codeforces.com/api/';
 const handle = encodeURIComponent(old.handle);
 // Codeforces permits only one request every two seconds.
 const info = await getJSON(base + 'user.info?handles=' + handle);
 const profile = asArray(info.result)[0];
 if (!profile) throw new Error('Codeforces profile unavailable');
 await pause(2100);
 let contests = old.contests;
 try {
  const ratings = await getJSON(base + 'user.rating?handle=' + handle);
  contests = asArray(ratings.result).map(entry => ({
   date: Number(entry.ratingUpdateTimeSeconds), rating: Number(entry.newRating), name: String(entry.contestName || '')
  }));
 } catch { /* Retain known rating history if this optional request fails. */ }
 let submissions: any[] = [];
 for (let page = 0; page < 100; page++) {
  await pause(2100);
  const result = await getJSON(base + 'user.status?handle=' + handle + '&from=' + (page * 1000 + 1) + '&count=1000');
  if (result.status !== 'OK' || !Array.isArray(result.result)) throw new Error('Invalid Codeforces submission history');
  submissions = submissions.concat(result.result);
  if (result.result.length < 1000) break;
  if (page === 99) throw new Error('Codeforces submission history exceeded safety limit');
 }
 const keys = new Set<string>();
 const difficulty: Record<string, number> = {};
 for (const submission of submissions) {
  if (submission?.verdict !== 'OK') continue;
  const problem = asObject(submission.problem);
  const key = problem.contestId != null && problem.index != null
   ? 'contest:' + problem.contestId + '/' + problem.index
   : problem.name ? 'name:' + problem.name : null;
  if (!key || keys.has(key)) continue;
  keys.add(key);
  const rating = numeric(problem.rating);
  if (rating !== null) difficulty[String(rating)] = (difficulty[String(rating)] || 0) + 1;
 }
 return { ...old, rating: numeric(profile.rating), maxRating: numeric(profile.maxRating),
  rank: profile.rank || null, contests, solved: keys.size, difficulty };
}
async function refreshGitHub(old: Github): Promise<Github> {
 const user = encodeURIComponent(old.username);
 const root = 'https://api.github.com';
 const [p, events, prs] = await Promise.all([
  getJSON(root + '/users/' + user),
  getJSON(root + '/users/' + user + '/events/public?per_page=100').catch(() => []),
  getJSON(root + '/search/issues?q=' + encodeURIComponent('type:pr author:' + old.username + ' is:merged') +
   '&sort=updated&order=desc&per_page=20').catch(() => ({items: []}))
 ]);
 const activity: Record<string, number> = {};
 for (const event of asArray(events)) {
  if (event.type !== 'PushEvent') continue;
  const date = String(event.created_at || '').slice(0, 10);
  if (date) activity[date] = (activity[date] || 0) + (asArray(event.payload?.commits).length || 1);
 }
 // Annual contributions need authenticated GitHub GraphQL, so preserve their
 // last encrypted scheduled snapshot instead of inventing a public count.
 return { ...old, publicRepos: numeric(p.public_repos), followers: numeric(p.followers),
  activity: Object.keys(activity).length ? activity : old.activity,
  prs: asArray(prs.items).map(pr => ({
   title: String(pr.title || ''), url: String(pr.html_url || ''),
   repo: String(pr.repository_url || '').split('/').slice(-2).join('/'),
   mergedAt: String(pr.pull_request?.merged_at || pr.closed_at || '')
  })),
  recent: asArray(events).filter(event => ['PushEvent','PullRequestEvent','IssuesEvent','CreateEvent'].includes(event.type))
   .slice(0, 14).map(event => ({
    type: String(event.type).replace('Event', ''), repo: String(event.repo?.name || ''),
    date: String(event.created_at || ''), url: 'https://github.com/' + String(event.repo?.name || '')
   })) };
}

export async function refreshPublicData(previous: DashboardData, passphrase: string): Promise<RefreshReport> {
 const refreshed: string[] = [];
 const errors: Record<string, string> = {};
 let next = previous;
 let snapshotChanged = false;
 try {
  const snapshot = await loadDashboard(passphrase); // no-store, always re-download latest deployment
  if (snapshot.schema !== 1 || !snapshot.phases) throw new Error('Invalid snapshot');
  snapshotChanged = snapshot.updatedAt !== previous.updatedAt;
  next = snapshot;
 } catch (error) {
  errors.snapshot = error instanceof Error ? error.message : 'Snapshot unavailable';
 }
 const jobs = [
  ['leetcode', () => refreshLeetCode(next.leetcode)],
  ['codeforces', () => refreshCodeforces(next.codeforces)],
  ['github', () => refreshGitHub(next.github)]
 ] as const;
 const results = await Promise.allSettled(jobs.map(async ([, run]) => run()));
 const sources = { ...next.sources };
 const now = new Date().toISOString();
 const updated = { ...next };
 results.forEach((result, index) => {
  const key = jobs[index][0];
  if (result.status === 'fulfilled') {
   if (key === 'leetcode') updated.leetcode = result.value as LC;
   if (key === 'codeforces') updated.codeforces = result.value as CF;
   if (key === 'github') updated.github = result.value as Github;
   sources[key] = { updatedAt: now, error: null };
   refreshed.push(key);
  } else {
   const detail = result.reason instanceof Error ? result.reason.message : 'Request failed';
   errors[key] = detail;
   sources[key] = { ...sources[key], error: 'Live refresh: ' + detail };
  }
 });
 updated.sources = sources;
 if (refreshed.length) updated.updatedAt = now;
 return { data: updated, refreshed, errors, snapshotChanged };
}
