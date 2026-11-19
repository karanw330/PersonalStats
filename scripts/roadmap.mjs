import { readFile } from 'node:fs/promises';

export const ROADMAP_REVISION = 'aws-billing-2026-11-20';

export function parseRoadmap(markdown) {
  const sectionHeaders = [...markdown.matchAll(/^## (Completed foundations[^\n]*|Phase (\d+) — ([^\n]+))$/gm)];
  const sections = sectionHeaders.filter(h => h[1].startsWith('Completed foundations') || h[2]);
  if (sections.length !== 6 || !sections[0][1].startsWith('Completed foundations')) {
    throw new Error('Updated AWS roadmap must contain completed foundations plus five phases');
  }
  const subtitles = ['Completed foundations','Kafka reliability','MySQL durability','Correctness and metrics','REST API and dashboard','Docker and polish'];
  const phases = sections.map((h, i) => {
    const end = i + 1 < sections.length ? sections[i + 1].index : markdown.indexOf('## Optional work');
    const content = markdown.slice(h.index + h[0].length, end < 0 ? undefined : end);
    const milestones = [...content.matchAll(/^- \[([ x])\] \*\*((F\d+|M\d+\.\d+) — ([^*]+))\*\* ([^\n]*)$/gm)]
      .map(m => ({
        id: m[3],
        title: m[4].trim(),
        description: m[5].trim(),
        done: m[1] === 'x'
      }));
    if (!milestones.length) throw new Error('Missing milestones for section ' + h[1]);
    const exitCriteria = content.match(/^\*\*Exit criteria:\*\* (.+)$/m)?.[1] || '';
    const id = i === 0 ? 0 : Number(h[2]);
    const title = i === 0 ? 'Completed foundations' : h[3].trim();
    return { id, title, subtitle: subtitles[i], exitCriteria, milestones };
  });
  const ids = phases.flatMap(p => p.milestones.map(m => m.id));
  if (ids.length !== 35 || new Set(ids).size !== 35 || ids.filter(id=>id.startsWith('F')).length !== 8 || phases.slice(1).length !== 5) {
    throw new Error('Unexpected AWS roadmap milestone counts or duplicate IDs');
  }
  return phases;
}

export async function readRoadmap() {
  const markdown = await readFile(new URL('../docs/billing-pipeline-milestones.md', import.meta.url), 'utf8');
  return parseRoadmap(markdown);
}
