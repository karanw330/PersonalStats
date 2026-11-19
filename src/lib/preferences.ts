import { sealObject, unsealObject, type Sealed } from './crypto';
import type { DashboardData, Phase } from '../types';
export type LocalChanges={ milestones:Record<string,boolean>; backlog:DashboardData['backlog']; goals:DashboardData['goals']; phases?:Phase[] };
const KEY='devpulse-changes-v1';
export async function loadLocalChanges(password:string):Promise<LocalChanges|null>{
  const val=localStorage.getItem(KEY);if(!val)return null;
  try{return await unsealObject<LocalChanges>(JSON.parse(val) as Sealed,password)}catch{return null}
}
export async function saveLocalChanges(value:LocalChanges,password:string){localStorage.setItem(KEY,JSON.stringify(await sealObject(value,password)))}
export function downloadJson(filename:string,data:object){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function exportChanges(value:LocalChanges,password:string){downloadJson('devpulse-backup.encrypted.json',await sealObject(value,password))}
export async function importChanges(file:File,password:string):Promise<LocalChanges>{
 const body=JSON.parse(await file.text());const obj=await unsealObject<LocalChanges>(body,password);
 if(!obj||!Array.isArray(obj.backlog)||!obj.milestones||!obj.goals)throw new Error('Invalid backup');return obj;
}

/** Parse the current five-phase AWS milestone Markdown without uploading it to a server. */
export function parseMilestoneMarkdown(markdown:string):Phase[]{
 const headers=[...markdown.matchAll(/^## Phase (\d+) — (.+)$/gm)];
 if(headers.length!==5)throw new Error('Expected five numbered phases in the updated milestone plan');
 const subtitles=['Kafka reliability','MySQL durability','Tests and metrics','API and dashboard','Docker and polish'];
 return headers.map((header,index)=>{
  const section=markdown.slice(header.index!+header[0].length,index+1<headers.length?headers[index+1].index:markdown.length);
  const milestones=[...section.matchAll(/^- \[([ x])\] \*\*(M\d+\.\d+) — ([^*]+)\*\*([^\n]*)/gm)].map(m=>({
   id:m[2],title:m[3].trim(),description:m[4].trim(),done:m[1]==='x'
  }));
  if(!milestones.length)throw new Error('No milestones found in phase '+header[1]);
  const exitCriteria=section.match(/^\*\*Exit criteria:\*\*\s*(.+)$/m)?.[1]?.trim()||'';
  return {id:Number(header[1]),title:header[2].replace(/\*\*/g,'').trim(),subtitle:subtitles[index],exitCriteria,milestones};
 });
}
