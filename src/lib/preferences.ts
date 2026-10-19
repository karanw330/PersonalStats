import { sealObject, unsealObject, type Sealed } from './crypto';
import type { DashboardData } from '../types';
export type LocalChanges={ milestones:Record<string,boolean>; backlog:DashboardData['backlog']; goals:DashboardData['goals'] };
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
