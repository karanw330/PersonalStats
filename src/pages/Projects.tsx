import { useState } from 'react';
import { Checkbox, Progress } from '@mantine/core';
import { IconCheck, IconArrowUpRight, IconCode, IconDatabase, IconLayersIntersect, IconRosette, IconServer, IconShieldCheck, IconStack2, IconTopologyStar3 } from '@tabler/icons-react';
import type { DashboardData } from '../types';
import type { LocalChanges } from '../lib/preferences';
import { completed, fraction, totalMilestones } from '../lib/utils';
import { GoalOrbit } from '../components/Visuals';
const phaseIcons=[IconCode,IconLayersIntersect,IconTopologyStar3,IconShieldCheck,IconDatabase,IconStack2,IconServer];
const tones=['violet','yellow','mint','pink','violet','mint','yellow'];
export function Projects({data,changes,update}:{data:DashboardData;changes:LocalChanges;update:(n:LocalChanges)=>Promise<void>}){
 const phases=data.phases;const firstPending=phases.find(p=>p.milestones.some(x=>!x.done))?.id||1;
 const [expanded,setExpanded]=useState(firstPending);
 const done=completed(phases),total=totalMilestones(phases);
 const toggle=(id:string,current:boolean)=>void update({...changes,milestones:{...changes.milestones,[id]:!current}});
 return <div className="bento-grid projects-grid">
  <section className="bento-card span-12 mission-overview"><div className="mission-summary-text"><span className="overline">FEATURE PROJECT / 001</span><h2>AWS-style<br/>Billing Pipeline<span className="title-asterisk">✳</span></h2><p>From raw usage events to a durable, reconciled, observable billing pipeline. Each milestone is an actual engineering deliverable.</p><a href="https://github.com/karanw330/AWS-Billing" target="_blank" rel="noreferrer" className="pill-link">View source repository <IconArrowUpRight size={17}/></a></div><div className="mission-score"><GoalOrbit value={done} target={total} size={186}/><div><strong>{done}<span> / {total}</span></strong><small>CHECKPOINTS CLEARED</small></div></div></section>
  <section className="bento-card span-12"><div className="card-head"><div className="card-title"><span className="card-icon lavender-icon"><IconRosette size={22}/></span><h2>Milestone board</h2></div><span className="little-pill">{phases.length} PHASES</span></div>
  <div className="phase-board">{phases.map((phase,i)=>{const n=phase.milestones.filter(m=>m.done).length,all=phase.milestones.length,percent=fraction(n,all),Icon=phaseIcons[i]||IconCode;return <div className={`phase-section ${expanded===phase.id?'expanded':''}`} key={phase.id}>
   <button type="button" className="phase-heading" onClick={()=>setExpanded(expanded===phase.id?0:phase.id)} aria-expanded={expanded===phase.id}>
    <span className={`phase-symbol tone-${tones[i]}`}><Icon size={24} stroke={1.65}/></span><span className="phase-description"><small>PHASE {String(phase.id).padStart(2,'0')} · {phase.subtitle.toUpperCase()}</small><strong>{phase.title}</strong></span><span className="phase-right"><b>{n}/{all}</b><span>{n===all?'COMPLETED':n?'IN PROGRESS':'UP NEXT'}</span></span><span className={`phase-arrow ${expanded===phase.id?'open':''}`}>↗</span>
   </button><div className="phase-meter"><span style={{width:`${percent}%`}}/></div>
   {expanded===phase.id&&<div className="phase-detail"><div className="milestone-grid">{phase.milestones.map(m=><label key={m.id} className={`milestone-line ${m.done?'is-done':''}`}><Checkbox checked={m.done} onChange={()=>toggle(m.id,m.done)} color="dark" radius="sm" size="md"/><span><b>{m.id}</b><strong>{m.title}</strong><small>{m.description}</small></span></label>)}</div>{phase.exitCriteria&&<div className="exit-criteria"><IconCheck size={18}/><div><b>Exit criteria</b><p>{phase.exitCriteria}</p></div></div>}</div>}
  </div>})}</div><div className="project-note">Changes are encrypted in local storage and won't alter your GitHub repository. Export an encrypted backup from Settings to transfer them between devices.</div></section>
 </div>;
}
