import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { seal, unseal } from './vault.mjs';

const p = process.env.DEVPULSE_PASSPHRASE;
if (!p) {console.error('Missing DEVPULSE_PASSPHRASE'); process.exit(1);}
const conf = unseal(JSON.parse(await readFile(new URL('../private/config.enc.json',import.meta.url),'utf8')),p);
const username = process.env.GITHUB_USERNAME || 'karanw330';
const lcuser = process.env.LEETCODE_USERNAME || 'pUH5KueiJ3';
const cfhandle = process.env.CODEFORCES_HANDLE || 'karanw330';
const githubToken = process.env.GH_API_TOKEN || process.env.GITHUB_TOKEN || '';
const now = new Date().toISOString();
const stamp = () => new Date().toISOString();
const sources = {};
const isNumber = x => typeof x === 'number' && Number.isFinite(x);
const number = x => isNumber(x) ? x : (x !== null && x !== undefined && x !== '' && isNumber(Number(x)) ? Number(x) : null);
const str = x => x === null || x === undefined ? '' : String(x);
const arr = x => Array.isArray(x) ? x : [];
const object = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const unixISO = x => {const n=number(x); if(n===null)return ''; return new Date(n*(n<1e12?1000:1)).toISOString()};
async function get(url, {auth=false, method='GET', body}={}) {
  const controller = new AbortController(); const timeout=setTimeout(()=>controller.abort(),18000);
  try {
    const res = await fetch(url,{method,body:body?JSON.stringify(body):undefined,signal:controller.signal,
      headers:{'Accept':'application/json','User-Agent':'DevPulse-Static-Dashboard','Content-Type':'application/json',...(auth && githubToken?{'Authorization':`Bearer ${githubToken}`}:{}),...(auth?{'X-GitHub-Api-Version':'2022-11-28'}:{})}});
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data=await res.json(); if (data?.status==='FAILED') throw new Error(data.comment || 'Upstream returned FAILED');return data;
  } finally { clearTimeout(timeout); }
}
async function individually(key, fn) {
  try { const val=await fn();sources[key]={updatedAt:stamp(),error:null}; return val; }
  catch(e) { sources[key]={updatedAt:null,error:String(e.message||e).slice(0,130)};console.warn(`[${key}]`,e.message);return null; }
}
async function lc() {
 // Prefer LeetCode's own public GraphQL profile data to a rate-limited proxy.
 const query = `query dashboardProfile($username: String!) {
   matchedUser(username: $username) {
     submitStatsGlobal { acSubmissionNum { difficulty count } }
     userCalendar { submissionCalendar }
   }
   recentAcSubmissionList(username: $username, limit: 15) {
     title titleSlug timestamp
   }
 }`;
 const parseCalendar = raw => {
   const result = {};
   try {
     const obj = typeof raw === 'string' ? JSON.parse(raw) : object(raw);
     for (const [k, v] of Object.entries(obj)) {
       const day = /^\d+$/.test(k) ? new Date(Number(k) * 1000).toISOString().slice(0, 10) : k.slice(0, 10);
       if (/^\d{4}-\d\d-\d\d$/.test(day)) result[day] = number(v) ?? 0;
     }
   } catch (e) { console.warn('LeetCode calendar parse:', e.message); }
   return result;
 };
 try {
   const response = await get('https://leetcode.com/graphql/', {
     method: 'POST', body: { query, variables: { username: lcuser } }
   });
   if (response.errors?.length) throw new Error(response.errors.map(e => e.message).join('; '));
   const profile = response.data?.matchedUser;
   if (!profile) throw new Error('LeetCode user profile unavailable');
   const counts = arr(profile.submitStatsGlobal?.acSubmissionNum);
   const count = difficulty => number(counts.find(x => x.difficulty === difficulty)?.count);
   const easy = count('Easy'), medium = count('Medium'), hard = count('Hard');
   const solved = count('All') ?? (easy !== null && medium !== null && hard !== null ? easy + medium + hard : null);
   const recent = arr(response.data?.recentAcSubmissionList).map(s => ({
     title: str(s.title || s.titleSlug), status: 'Accepted', date: unixISO(s.timestamp)
   }));
   if (solved === null) throw new Error('LeetCode solved counts missing');
   return { username: lcuser, solved, totalQuestions: null,
     difficulty: { easy: easy ?? 0, medium: medium ?? 0, hard: hard ?? 0 },
     calendar: parseCalendar(profile.userCalendar?.submissionCalendar),
     topics: [], recent, contestRating: null };
 } catch (e) {
   console.warn('LeetCode direct GraphQL unavailable:', e.message);
 }
 // One lightweight fallback request rather than five simultaneous proxy calls.
 const base = `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcuser)}`;
 const s = object(await get(`${base}/solved`));
 const solved = number(s.solvedProblem ?? s.totalSolved ?? s.solved ?? s.totalSolvedNum);
 if (solved === null) throw new Error('LeetCode direct and fallback sources unavailable');
 return { username: lcuser, solved, totalQuestions: number(s.totalQuestions),
   difficulty: { easy: number(s.easySolved ?? s.easySolvedCount) ?? 0,
     medium: number(s.mediumSolved ?? s.mediumSolvedCount) ?? 0,
     hard: number(s.hardSolved ?? s.hardSolvedCount) ?? 0 },
   calendar: {}, topics: [], recent: [], contestRating: null };
}

async function gh() {
 const root='https://api.github.com'; const enc=encodeURIComponent(username);
 const [profile, events, prs] = await Promise.all([
  get(`${root}/users/${enc}`,{auth:true}),get(`${root}/users/${enc}/events/public?per_page=100`,{auth:true}).catch(()=>[]),
  get(`${root}/search/issues?q=${encodeURIComponent(`type:pr author:${username} is:merged`)}&sort=updated&order=desc&per_page=20`,{auth:true}).catch(()=>({items:[]}))]);
 let activity={};for (const e of arr(events)) {
   if(e.type!=='PushEvent')continue;const day=str(e.created_at).slice(0,10);
   activity[day]=(activity[day]||0)+((e.payload?.commits?.length)||1);
 }
 let contributions=null;
 if (githubToken) try {
  const q=`query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const end=new Date(),start=new Date(end.getTime()-364*86400000);
  const graph=await get(`${root}/graphql`,{auth:true,method:'POST',body:{query:q,variables:{login:username,from:start.toISOString(),to:end.toISOString()}}});
  const data=graph?.data?.user?.contributionsCollection?.contributionCalendar;
  if(data){contributions=number(data.totalContributions);activity={};for(const week of arr(data.weeks))for(const day of arr(week.contributionDays))activity[day.date]=day.contributionCount;}
 }catch(e){console.warn('GitHub GraphQL contribution calendar unavailable:',e.message)}
 const mappedPrs=arr(prs.items).map(i=>({title:str(i.title),url:str(i.html_url),repo:str(i.repository_url).split('/').slice(-2).join('/'),mergedAt:str(i.pull_request?.merged_at||i.closed_at)}));
 return {username,publicRepos:number(profile.public_repos),followers:number(profile.followers),contributions,activity,prs:mappedPrs,
  recent:arr(events).filter(e=>['PushEvent','PullRequestEvent','IssuesEvent','CreateEvent'].includes(e.type)).slice(0,14).map(e=>({type:str(e.type).replace('Event',''),repo:str(e.repo?.name),date:str(e.created_at),url:`https://github.com/${str(e.repo?.name)}`}))};
}
async function cf() {
 const base='https://codeforces.com/api/'; const h=encodeURIComponent(cfhandle);
 const [users,ratings,submissions]=await Promise.all([get(`${base}user.info?handles=${h}`),get(`${base}user.rating?handle=${h}`).catch(()=>({result:[]})),get(`${base}user.status?handle=${h}&from=1&count=2000`).catch(()=>({result:[]}))]);
 const profile=arr(users.result)[0];if(!profile)throw new Error('Codeforces profile not found');
 const contests=arr(ratings.result).map(r=>({date:Number(r.ratingUpdateTimeSeconds),rating:Number(r.newRating),name:str(r.contestName)}));
 const byId=new Set(),difficulty={};for(const s of arr(submissions.result))if(s.verdict==='OK'){
  const id=`${s.problem?.contestId}-${s.problem?.index}`; if(byId.has(id))continue;byId.add(id);const d=number(s.problem?.rating);if(d!==null)difficulty[str(d)]=(difficulty[str(d)]||0)+1;
 }
 return {handle:cfhandle,rating:number(profile.rating),maxRating:number(profile.maxRating),rank:profile.rank||null,contests,solved:byId.size||null,difficulty};
}
// Failures do not fabricate stats: preserve the previous successful snapshot where possible.
const previousPath=new URL('../private/last-good.enc.json',import.meta.url);
let previous=null;try{previous=unseal(JSON.parse(await readFile(previousPath,'utf8')),p)}catch{}
const [l,g,c]=await Promise.all([individually('leetcode',lc),individually('github',gh),individually('codeforces',cf)]);
const fallback = {leetcode:{username:lcuser,solved:null,totalQuestions:null,difficulty:{easy:0,medium:0,hard:0},calendar:{},topics:[],recent:[],contestRating:null},
 github:{username,publicRepos:null,followers:null,contributions:null,activity:{},prs:[],recent:[]},codeforces:{handle:cfhandle,rating:null,maxRating:null,rank:null,contests:[],solved:null,difficulty:{}}};
const history=arr(previous?.weekly).slice(-51);
const date=now.slice(0,10), prevLast=history.at(-1);
const combined={schema:1,updatedAt:now,sources,leetcode:l||previous?.leetcode||fallback.leetcode,github:g||previous?.github||fallback.github,codeforces:c||previous?.codeforces||fallback.codeforces,
 phases:conf.phases,backlog:conf.backlog,goals:conf.goals,weekly:history};
const snap={date,leetcode:combined.leetcode.solved,github:combined.github.contributions,codeforces:combined.codeforces.rating,milestones:combined.phases.flatMap(x=>x.milestones).filter(x=>x.done).length};
if(!prevLast || prevLast.date!==date)combined.weekly.push(snap);else combined.weekly[combined.weekly.length-1]=snap;
await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/data/dashboard.enc.json',import.meta.url),JSON.stringify(seal(combined,p)));
await writeFile(previousPath,JSON.stringify(seal(combined,p)));
console.log(`Encrypted dashboard ready. ${Object.entries(sources).map(([k,v])=>`${k}:${v.error?'unavailable':'ok'}`).join(' | ')}`);
