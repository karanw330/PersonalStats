export type Milestone = { id: string; title: string; description: string; done: boolean };
export type Phase = { id: number; title: string; subtitle: string; exitCriteria: string; milestones: Milestone[] };
export type SolveDifficulty = { easy: number; medium: number; hard: number };
export type LC = {
  username: string; solved: number | null; totalQuestions: number | null; difficulty: SolveDifficulty;
  calendar: Record<string, number>; topics: { name: string; count: number }[];
  recent: { title: string; status: string; date: string }[];
  contestRating: number | null;
};
export type Github = {
  username: string; publicRepos: number | null; followers: number | null;
  contributions: number | null; activity: Record<string, number>;
  prs: { title: string; url: string; repo: string; mergedAt: string }[];
  recent: { type: string; repo: string; date: string; url: string }[];
};
export type CF = {
  handle: string; rating: number | null; maxRating: number | null; rank: string | null;
  contests: { date: number; rating: number; name: string }[];
  solved: number | null; difficulty: Record<string, number>;
};
export type Snapshot = { date: string; leetcode: number | null; github: number | null; codeforces: number | null; milestones: number };
export type DashboardData = {
  schema: 1; updatedAt: string; sources: Record<string, { updatedAt: string | null; error: string | null }>;
  leetcode: LC; github: Github; codeforces: CF; phases: Phase[]; weekly: Snapshot[];
  backlog: { title: string; topic: string; priority: string }[];
  goals: { leetcodeTarget: number; targetDate: string };
};
export type NavPage = 'overview' | 'coding' | 'github' | 'projects' | 'resume' | 'review';
