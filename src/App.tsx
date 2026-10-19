import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, TextInput, PasswordInput, useMantineColorScheme, Tooltip, Menu, Modal, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowRight, IconBolt, IconBriefcase, IconBrandGithub, IconChartDots3, IconCode, IconLayoutDashboard, IconLock, IconLockOpen, IconMoon, IconRefresh, IconSearch, IconSettings, IconSun, IconTimeline, IconChartBar, IconDownload, IconUpload, IconShieldLock, IconX } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'motion/react';
import type { DashboardData, NavPage } from './types';
import { loadDashboard } from './lib/crypto';
import { eraseLegacyResumeStorage } from './lib/legacy-resume-cleanup';
import { loadLocalChanges, saveLocalChanges, exportChanges, importChanges, type LocalChanges } from './lib/preferences';
import { prettyDate } from './lib/utils';
import { Overview } from './pages/Overview';
import { Coding } from './pages/Coding';
import { GithubPage } from './pages/Github';
import { Projects } from './pages/Projects';
import { Review } from './pages/Review';

const NAV: {id:NavPage;label:string;Icon:typeof IconBolt}[]=[
 {id:'overview',label:'Dashboard',Icon:IconLayoutDashboard},{id:'coding',label:'Progress',Icon:IconCode},
 {id:'github',label:'Work',Icon:IconBriefcase},{id:'projects',label:'Projects',Icon:IconTimeline},
{id:'review',label:'Reports',Icon:IconChartBar}
];
const IDLE_MS=15*60_000;
const resolveHash=():NavPage=>{const h=location.hash.replace('#','');return NAV.find(n=>n.id===h)?.id||'overview'};
export default function App(){
 const {colorScheme,setColorScheme}=useMantineColorScheme();
 const [page,setPage]=useState<NavPage>(resolveHash);
 const [password,setPassword]=useState('');const [entered,setEntered]=useState('');
 const [data,setData]=useState<DashboardData|null>(null);const [changes,setChanges]=useState<LocalChanges|null>(null);
 const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 const [command,setCommand]=useState(false);const [query,setQuery]=useState('');const [settings,setSettings]=useState(false);
 const [importing,setImporting]=useState(false);const inputRef=useRef<HTMLInputElement|null>(null);
 const lastActivity=useRef(Date.now());
 // Delete only the retired Resume Hub database; keep all current workspace preferences.
 useEffect(() => {
  void eraseLegacyResumeStorage().then(result => {
   if(result==='blocked' || result==='error'){
    notifications.show({color:'orange',title:'Old resume cleanup incomplete',message:'Close other DevPulse tabs and reload to retry deleting old resume data.'});
   }
  });
 }, []);

 const navigate=(v:NavPage)=>{setPage(v);location.hash=v;setCommand(false)};
 const lock=()=>{setData(null);setChanges(null);setPassword('');setEntered('');setPage('overview');setSettings(false);location.hash='';};
 useEffect(()=>{const h=()=>setPage(resolveHash());window.addEventListener('hashchange',h);return()=>window.removeEventListener('hashchange',h)},[]);
 useEffect(()=>{if(!data)return;const activity=()=>lastActivity.current=Date.now();for(const ev of ['pointerdown','keydown','touchstart','scroll'])window.addEventListener(ev,activity,{passive:true});const interval=setInterval(()=>{if(Date.now()-lastActivity.current>IDLE_MS)lock()},15_000);const visibility=()=>{if(document.visibilityState==='visible'&&Date.now()-lastActivity.current>IDLE_MS)lock()};document.addEventListener('visibilitychange',visibility);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',visibility);for(const ev of ['pointerdown','keydown','touchstart','scroll'])window.removeEventListener(ev,activity)}},[data]);
 useEffect(()=>{const hotkeys=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(data)setCommand(true)}if(e.key==='Escape')setCommand(false)};window.addEventListener('keydown',hotkeys);return()=>window.removeEventListener('keydown',hotkeys)},[data]);
 async function unlock(e?:React.FormEvent){e?.preventDefault();if(!entered.trim())return;setLoading(true);setError('');try{
  const result=await loadDashboard(entered);if(result.schema!==1||!result.phases)throw new Error('Invalid dashboard data');
  const local=await loadLocalChanges(entered);setPassword(entered);setData(result);
  setChanges(local||{milestones:{},backlog:result.backlog,goals:result.goals});setEntered('');lastActivity.current=Date.now();
 }catch(ex){setError(ex instanceof Error?ex.message:'Unable to unlock dashboard.');}finally{setLoading(false)}}
 const updateChanges=async(next:LocalChanges)=>{setChanges(next);try{await saveLocalChanges(next,password)}catch{notifications.show({color:'red',message:'Could not save changes locally'})}};
 const view=useMemo(()=>{if(!data)return null;const local=changes||{milestones:{},backlog:data.backlog,goals:data.goals};return {...data,backlog:local.backlog,goals:local.goals,phases:data.phases.map(p=>({...p,milestones:p.milestones.map(m=>({...m,done:local.milestones[m.id]??m.done}))}))}},[data,changes]);
 const configButton=()=>setSettings(true);
 if(!view)return <div className="auth-stage">
  <div className="auth-light auth-light-1"/><div className="auth-light auth-light-2"/>
  <div className="auth-card"><div className="logo-symbol"><IconBolt size={27} stroke={2.5}/></div><div className="auth-eyebrow">YOUR PRIVATE ENGINEERING OS / 001</div>
  <h1>Progress, but<br/><em>make it personal.</em></h1><p>All the work you've put in. One beautiful place to see it.</p>
  <div className="auth-wave" aria-hidden="true"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
  <form onSubmit={unlock} className="unlock-form"><PasswordInput label="Unlock your workspace" placeholder="Enter your strong passphrase" size="lg" value={entered} onChange={e=>setEntered(e.currentTarget.value)} leftSection={<IconLock size={17}/>} autoComplete="current-password" />
   {error&&<p role="alert" className="error-msg">{error}</p>}
   <Button size="lg" type="submit" fullWidth loading={loading} rightSection={<IconArrowRight size={18}/>}>Unlock dashboard</Button>
  </form><div className="auth-foot"><IconShieldLock size={16}/> Encrypted data · Decrypted only in your browser</div></div>
  <div className="auth-caption">DEVPULSE <span>✳</span> ENGINEERING, IN MOTION</div>
 </div>;
 const current= NAV.find(n=>n.id===page);
 return <div className="app-stage"><div className="app-shell">
  <header className="topbar"><div className="brand" onClick={()=>navigate('overview')} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&navigate('overview')}><span className="brand-mark"><IconBolt size={23}/></span><span className="brand-name">devpulse<span>.</span></span></div>
   <nav className="nav-pills" aria-label="Main navigation">{NAV.map(({id,label,Icon})=><button type="button" key={id} className={`nav-pill ${page===id?'active':''}`} onClick={()=>navigate(id)}><Icon size={17} stroke={1.75}/><span>{label}</span></button>)}</nav>
   <div className="top-actions"><Tooltip label="Search (Ctrl+K)"><ActionIcon variant="subtle" size={39} radius="xl" color="dark" onClick={()=>setCommand(true)} aria-label="Search"><IconSearch size={19}/></ActionIcon></Tooltip>
    <button className="theme-toggle" onClick={()=>setColorScheme(colorScheme==='dark'?'light':'dark')} title="Toggle theme">{colorScheme==='dark'?<IconSun size={20}/>:<IconMoon size={20}/>}</button>
    <Menu shadow="md" position="bottom-end"><Menu.Target><button className="avatar-menu" title="Workspace options">K</button></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconSettings size={16}/>} onClick={configButton}>Settings & backup</Menu.Item><Menu.Item leftSection={<IconLock size={16}/>} color="red" onClick={lock}>Lock workspace</Menu.Item></Menu.Dropdown></Menu>
   </div>
  </header>
  <main className="main-content"><div className="page-intro"><div><span className="intro-kicker">YOUR ENGINEERING WORKSPACE <span className="intro-star">✳</span> {page.toUpperCase()}</span><h1>{({overview:'Build. Learn. Repeat.',coding:'Solve the next one.',github:'Proof of work.',projects:'In the making.',review:'The bigger picture.'} as Record<NavPage,string>)[page]}</h1><p>{({overview:'A little progress, every single day. It all adds up.',coding:'LeetCode, Codeforces and the problems worth revisiting.',github:'Project evidence, source links and meaningful open-source work.',projects:'Every milestone of the AWS Billing pipeline, tracked.',review:'Look beyond today. Measure the weeks that matter.'} as Record<NavPage,string>)[page]}</p></div>
   <div className="intro-right"><span className="last-sync"><span className="status-dot"/> Snapshot {prettyDate(view.updatedAt)}</span><Button variant="filled" color="dark" radius="xl" className="quick-btn" leftSection={<IconBolt size={17}/>} onClick={()=>navigate('projects')}>View milestones</Button></div></div>
  <AnimatePresence mode="wait"><motion.div key={page} initial={{opacity:0,y:9}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-7}} transition={{duration:.18}}>
   {page==='overview'&&<Overview data={view} navigate={navigate}/>}
   {page==='coding'&&<Coding data={view} changes={changes!} update={updateChanges}/>}
   {page==='github'&&<GithubPage data={view}/>}
   {page==='projects'&&<Projects data={view} changes={changes!} update={updateChanges}/>}
   {page==='review'&&<Review data={view}/>}
  </motion.div></AnimatePresence></main>
  <footer className="site-footer"><span><span className="footer-dot">✳</span> Made to track the work, not the noise.</span><span>DEV PULSE <span className="footer-sep">/</span> 2026</span></footer>
 </div>
 <Modal opened={command} onClose={()=>setCommand(false)} title={<b>Jump somewhere</b>} centered radius="xl" size="md"><TextInput ref={inputRef} placeholder="Search pages..." leftSection={<IconSearch size={18}/>} value={query} onChange={e=>setQuery(e.currentTarget.value)} autoFocus/><div className="command-results">{NAV.filter(x=>x.label.toLowerCase().includes(query.toLowerCase())||x.id.includes(query.toLowerCase())).map(({id,label,Icon})=><button key={id} onClick={()=>{navigate(id);setQuery('')}}><Icon size={18}/><span>{label}</span><IconArrowRight size={15}/></button>)}</div></Modal>
 <Modal opened={settings} onClose={()=>setSettings(false)} title="Workspace settings" centered radius="xl" size="md"><div className="settings-body">
 <div><h3>Private data backup</h3><p>Manual changes are encrypted locally on this device. Download a password-encrypted backup to transfer them to another device.</p></div>
 <Button variant="light" leftSection={<IconDownload size={17}/>} onClick={()=>exportChanges(changes!,password).then(()=>notifications.show({message:'Encrypted backup downloaded'})).catch(()=>notifications.show({color:'red',message:'Backup failed'}))}>Export encrypted changes</Button>
 <Button component="label" variant="light" color="gray" leftSection={<IconUpload size={17}/>} loading={importing}>Import encrypted backup<input hidden type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setImporting(true);try{const next=await importChanges(f,password);await updateChanges(next);notifications.show({message:'Backup imported'})}catch{notifications.show({color:'red',message:'Could not decrypt this backup with your passphrase'})}finally{setImporting(false);e.target.value=''}}}/></Button>
 <div className="settings-note"><IconShieldLock size={18}/> Your locally saved milestone and revision changes are encrypted in this browser. Your passphrase is not sent to a server.</div>
 <Button variant="light" color="red" leftSection={<IconLock size={17}/>} onClick={lock}>Lock now</Button></div></Modal>
 </div>;
}
