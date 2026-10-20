// Codeforces API user.status is paginated; counting one page can miss old ACs.
export async function fetchAllCodeforcesSubmissions(fetchPage, { pageSize = 1000, maxPages = 100, pause = async () => {} } = {}) {
  const submissions = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize + 1;
    const response = await fetchPage(from, pageSize);
    if (response?.status !== 'OK' || !Array.isArray(response.result)) {
      throw new Error('Codeforces submission history unavailable or malformed');
    }
    submissions.push(...response.result);
    if (response.result.length < pageSize) {
      return { submissions, pages: page + 1 };
    }
    await pause();
  }
  // Never publish a partial history as an accurate all-time solved total.
  throw new Error('Codeforces submission history exceeded pagination safety limit');
}

export function summarizeCodeforcesSolves(submissions) {
  const solvedIds = new Set();
  const difficulty = {};
  for (const submission of submissions) {
    if (submission?.verdict !== 'OK') continue;
    const problem = submission.problem || {};
    // Some Gym / legacy submissions lack contestId. Avoid collapsing all of
    // those into the same "undefined-index" key.
    const key = problem.contestId != null && problem.index != null
      ? `contest:${problem.contestId}/${problem.index}`
      : problem.name ? `name:${problem.name}` : null;
    if (!key || solvedIds.has(key)) continue;
    solvedIds.add(key);
    const rating = Number(problem.rating);
    if (problem.rating != null && Number.isFinite(rating)) {
      difficulty[String(rating)] = (difficulty[String(rating)] || 0) + 1;
    }
  }
  return { solved: solvedIds.size, difficulty };
}
