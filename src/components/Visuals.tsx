import React, { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Phase } from '../types';
import { fmt } from '../lib/utils';

function dayLabel(day:string, count:number, noun:string) {
 const date = new Date(`${day}T12:00:00Z`);
 const formatted = new Intl.DateTimeFormat('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(date);
 return `${formatted} · ${count} ${noun}`;
}
function localDay(date:Date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
type ActivityProps={calendar:Record<string,number>;days?:number;className?:string};
export function ActivitySkyline({calendar,days=35,className=''}:ActivityProps){
 const end=new Date();end.setHours(12,0,0,0);
 const dates=Array.from({length:days},(_,i)=>{const d=new Date(end);d.setDate(end.getDate()-days+1+i);return localDay(d)});
 const max=Math.max(1,...dates.map(d=>calendar[d]||0));
 return <div className={`skyline ${className}`} aria-label="Daily activity over the last several weeks">
  <div className="skyline-bars">{dates.map((d,i)=>{const v=calendar[d]||0;return <div title={dayLabel(d,v,'contributions')} aria-label={dayLabel(d,v,'contributions')} tabIndex={0} key={d} className={`sky-bar ${!v?'sky-empty':''}`} style={{height:`${Math.max(v?17:10, v/max*100)}%`, '--i':i, '--v':v} as React.CSSProperties}><span/></div>})}</div>
  <div className="axis"><span>{dates[0].slice(5)}</span><span>DAILY ACTIVITY</span><span>NOW</span></div>
 </div>;
}
export function GoalOrbit({value,target,accent='var(--lavender)',size=150}:{value:number|null;target:number;accent?:string;size?:number}){
 const reduceMotion=useReducedMotion();
 const pct=value!==null&&target>0?Math.min(100,Math.round(value/target*100)):0;const dash=(pct/100)*302;
 return <div className="goal-orbit" style={{width:size,height:size}}>
  <svg viewBox="0 0 120 120" role="img" aria-label={value===null?'Goal progress unavailable':`${pct} percent of goal complete`}>
   <circle cx="60" cy="60" r="48" stroke="var(--orbit-track)" strokeWidth="11" fill="none"/>
   <motion.circle cx="60" cy="60" r="48" stroke={accent} strokeWidth="11" strokeLinecap="round" initial={reduceMotion?false:{strokeDasharray:"0 302"}} animate={{strokeDasharray:`${dash} 302`}} transition={{duration:reduceMotion?0:1.05,ease:[0.22,1,0.36,1]}} fill="none" transform="rotate(-90 60 60)"/>
   <circle cx="60" cy="60" r="35" fill="none" stroke="var(--outline)" strokeDasharray="2 5"/>
  </svg>
  <div className="orbit-text"><strong>{value===null?'—':`${pct}%`}</strong><small>OF TARGET</small></div>
 </div>
}
export function ActivityMosaic({calendar,weeks=16}:{calendar:Record<string,number>;weeks?:number}){
 const end=new Date();end.setHours(12,0,0,0);const sunday=new Date(end);sunday.setDate(end.getDate()-end.getDay());
 const boxes=Array.from({length:weeks*7},(_,i)=>{const d=new Date(sunday);d.setDate(sunday.getDate()-(weeks-1)*7+i);return localDay(d)});
 return <div className="mosaic-wrap"><div className="mosaic">{boxes.map(d=>{const n=calendar[d]||0;return <div key={d} title={dayLabel(d,n,'submissions')} aria-label={dayLabel(d,n,'submissions')} tabIndex={0} className="mosaic-cell" data-level={n===0?0:n<3?1:n<6?2:n<10?3:4} />})}</div><div className="mosaic-legend"><span>Less</span>{[0,1,2,3,4].map(x=><i key={x} data-level={x}/>)}<span>More</span></div></div>
}
export function DifficultyStack({easy,medium,hard}:{easy:number;medium:number;hard:number}){
 const total=easy+medium+hard;
 return <><div className="difficulty-bars" aria-label={`Easy ${easy}, medium ${medium}, hard ${hard}`}>
  {[['Easy',easy,'var(--mint)'],['Medium',medium,'var(--yellow)'],['Hard',hard,'var(--coral)']].map(([label,count,color])=><div className="diff-row" key={String(label)}><div className="diff-text"><span>{label}</span><b>{fmt(Number(count))}</b></div><div className="diff-track"><div style={{width:`${total?Number(count)/total*100:0}%`,background:String(color)}}/></div></div>)}
 </div></>;
}
export function RatingTrajectory({contests,compact=false}:{contests:{date:number;rating:number;name:string}[];compact?:boolean}){
 const id=useId().replace(/:/g,'');
 if (!contests.length) return <div className="empty-chart">Rating history will appear after your first rated contest sync.</div>;
 const ratings=contests.slice(-25), min=Math.min(...ratings.map(x=>x.rating))-70, max=Math.max(...ratings.map(x=>x.rating))+70;
 const pts=ratings.map((x,i)=>[12+i*(576/Math.max(1,ratings.length-1)),190-((x.rating-min)/(max-min))*155]);
 const poly=pts.map(p=>p.join(',')).join(' ');
 const area=`M${pts[0][0]},190 L${pts.map(p=>p.join(',')).join(' L')} L${pts.at(-1)![0]},190 Z`;
 const last=pts.at(-1)!;
 return <div className={`rating-chart ${compact?'rating-compact':''}`}><svg viewBox="0 0 600 218" width="100%" role="img" aria-label="Codeforces rating history">
 <defs><linearGradient id={`r-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b4a2ff" stopOpacity=".45"/><stop offset="100%" stopColor="#b4a2ff" stopOpacity="0"/></linearGradient></defs>
 {[37,88,140,190].map(y=><line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--outline)" strokeDasharray="4 9"/>)}
 <path d={area} fill={`url(#r-${id})`}/><polyline points={poly} fill="none" stroke="var(--lavender-strong)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
 {pts.map((pt,i)=><circle key={i} cx={pt[0]} cy={pt[1]} r={i===pts.length-1?7:3} fill={i===pts.length-1?'var(--yellow)':'var(--lavender-strong)'} stroke="var(--card)" strokeWidth="3"><title>{ratings[i].name}: {ratings[i].rating}</title></circle>)}
 <text x={Math.max(20,last[0]-10)} y={Math.max(18,last[1]-16)} textAnchor="end" fill="var(--text)" fontSize="16" fontWeight="800">{ratings.at(-1)?.rating}</text></svg><div className="axis"><span>{new Date(ratings[0].date*1000).getFullYear()}</span><span>CONTEST RATING</span><span>LATEST</span></div></div>
}
export function PhasesRail({phases,selected,onSelect}:{phases:Phase[];selected:number;onSelect:(id:number)=>void}){
 return <div className="phase-rail">{phases.map((ph,i)=>{const done=ph.milestones.filter(m=>m.done).length,all=ph.milestones.length;return <React.Fragment key={ph.id}>
  {i>0&&<div className="rail-connector"/>}
  <button className={`phase-dot ${selected===ph.id?'selected':''} ${done===all?'complete':''}`} title={`${ph.title} (${done}/${all})`} onClick={()=>onSelect(ph.id)} type="button"><span>{done===all?'✓':String(ph.id).padStart(2,'0')}</span><small>{ph.title.split(' ')[0]}</small></button>
 </React.Fragment>})}</div>
}
export function DecorativeFlower({tone='violet'}:{tone?:'violet'|'yellow'|'mint'}){
 return <div className={`flower flower-${tone}`} aria-hidden="true"><span>✳</span></div>
}
export function StatBadge({label,value}:{label:string;value:string|number}){return <span className="mini-stat"><b>{value}</b><span>{label}</span></span>}
