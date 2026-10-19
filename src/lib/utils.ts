import type { DashboardData, Phase } from '../types';
export const fmt = (v: number | null | undefined) => v === null || v === undefined ? '—' : Intl.NumberFormat('en-IN').format(v);
export function completed(phases: Phase[]) { return phases.reduce((s,p)=>s+p.milestones.filter(m=>m.done).length,0); }
export function totalMilestones(phases: Phase[]) { return phases.reduce((s,p)=>s+p.milestones.length,0); }
export function fraction(done: number, target: number) { return target ? Math.min(100, Math.round(done/target*100)) : 0; }
export function prettyDate(iso: string | null | undefined) { if (!iso) return 'Not synced'; const t = new Date(iso); return Number.isNaN(t.valueOf()) ? 'Not synced' : t.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}); }
export function statusData(d: DashboardData, key: string) { return d.sources[key]?.error ? 'Sync unavailable' : prettyDate(d.sources[key]?.updatedAt); }
export function localDate() { return new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); }
