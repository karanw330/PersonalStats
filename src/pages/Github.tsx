import { IconArrowUpRight, IconBrandGithub, IconGitPullRequest, IconCode, IconDatabase, IconExternalLink, IconSparkles } from '@tabler/icons-react';
import type { DashboardData } from '../types';
import { completed, totalMilestones, statusData } from '../lib/utils';

type ProofLink = { title:string; url:string; repo:string; mergedAt:string };

export function GithubPage({data}:{data:DashboardData}){
 const username=data.github.username.toLowerCase();
 // External merged PRs are more informative than pushes in one's own repositories.
 // The collector returns only the latest 20 matched PRs, so don't present this as a lifetime total.
 const external:ProofLink[]=data.github.prs.filter(pr=>{
  const [owner]=pr.repo.split('/');
  return owner?.toLowerCase()!==username && /^https:\/\/github\.com\//.test(pr.url);
 });
 const groups=Array.from(new Set(external.map(pr=>pr.repo)));
 const finished=completed(data.phases),total=totalMilestones(data.phases);
 const next=data.phases.flatMap(p=>p.milestones.map(m=>({...m,phase:p.title}))).find(m=>!m.done);

 return <div className="bento-grid github-grid impact-grid">
  <section className="bento-card span-12 impact-hero">
   <div className="impact-hero-copy"><span className="overline">ENGINEERING WORK / EVIDENCE FIRST</span>
    <h2>Things I've built.<br/><em>Things I can explain.</em></h2>
    <p>A shortlist of projects and real contributions worth discussing. No vanity metrics, raw event feed or automatically generated achievement claims.</p>
   </div>
   <a className="pill-link" href={`https://github.com/${data.github.username}`} target="_blank" rel="noreferrer">GitHub profile <IconArrowUpRight size={17}/></a>
  </section>

  <section className="bento-card span-12">
   <div className="card-head"><div className="card-title"><span className="card-icon lavender-icon"><IconCode size={22}/></span><h2>Featured engineering projects</h2></div><span className="little-pill">SOURCE-LINKED</span></div>
   <div className="impact-projects">
    <div className="impact-project impact-purple">
     <span className="overline">01 / EVENT-DRIVEN BACKEND</span>
     <h3>AWS-style Billing Pipeline</h3>
     <p>Usage ingestion, billing logic and a phased roadmap for idempotency, persistence and reconciliation.</p>
     <div className="impact-status"><strong>{finished} / {total}</strong><span>milestones currently checked</span></div>
     <div className="impact-progress" aria-label={`${finished} of ${total} milestones completed`}><span style={{width:`${total?Math.round(finished/total*100):0}%`}}/></div>
     {next&&<small className="impact-next">Next unchecked: {next.title}</small>}
     <a className="impact-link" href="https://github.com/karanw330/AWS-Billing" target="_blank" rel="noreferrer">View code <IconArrowUpRight size={16}/></a>
    </div>
    <div className="impact-project impact-mint">
     <span className="overline">02 / BACKEND APPLICATION</span>
     <h3>CrypSim</h3>
     <p>Crypto trading simulator built with Python, FastAPI and WebSockets. Explore the implementation and architectural choices.</p>
     <div className="impact-proof"><IconDatabase size={18}/><span>Repository and code are the evidence. No unverified throughput claims.</span></div>
     <a className="impact-link" href="https://github.com/karanw330/CrypSim" target="_blank" rel="noreferrer">View code <IconArrowUpRight size={16}/></a>
    </div>
   </div>
  </section>

  <section className="bento-card span-12">
   <div className="card-head"><div className="card-title"><span className="card-icon yellow-icon"><IconGitPullRequest size={22}/></span><h2>Open-source contributions</h2></div><span className="little-pill">EXTERNAL REPOSITORIES</span></div>
   <p className="muted-note">Merged pull requests to repositories outside your own account. Use the linked changes as interview evidence, not just a PR count.</p>
   {external.length?
    <div className="impact-contributions">{groups.map(repo=><div className="impact-repo" key={repo}>
      <div className="impact-repo-head"><IconBrandGithub size={17}/><strong>{repo}</strong><span>{external.filter(p=>p.repo===repo).length} shown</span></div>
      {external.filter(p=>p.repo===repo).slice(0,5).map(pr=><a className="impact-pr" href={pr.url} target="_blank" rel="noreferrer" key={pr.url}>
       <span>{pr.title}</span><small>{pr.mergedAt?new Date(pr.mergedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Merged'}</small><IconExternalLink size={16}/>
      </a>)}
     </div>)}</div>
   :<div className="impact-empty"><IconSparkles size={22}/><div><strong>No external merged PRs in the current snapshot</strong><p>The GitHub collector loads up to 20 recent matches. Older contributions might not be included; your GitHub profile remains the full source.</p></div></div>}
  </section>
  <section className="bento-card span-12 impact-source-note">
   <strong>Evidence, not estimates.</strong>
   <p>Project links lead to the source code. Milestone status reflects your editable local project checklist, not a verified deployment. The external PR list comes from the latest GitHub sync and is not a complete historical archive.</p>
   <span>GitHub sync: {statusData(data,'github')}</span>
  </section>
 </div>;
}
