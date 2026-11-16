// Generates Memphis-style stats cards from the GitHub GraphQL API.
// Run: GH_TOKEN=$(gh auth token) node scripts/build-stats.mjs
// Only public repositories are counted for repos, stars and languages.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  C, PALETTE, block, canvas, esc, float, halfCircle, plus, ring, spin, squiggle, svgDocument, triangle,
} from './memphis.mjs';

const ASSETS_DIR = fileURLToPath(new URL('../assets/', import.meta.url));
const LOGIN = process.env.GH_LOGIN ?? 'alfredoptarigan';
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const TOP_LANGUAGES = 6;
const ACTIVITY_WEEKS = 26;
const DAY_MS = 86_400_000;

if (!TOKEN) {
  console.error('Missing GH_TOKEN / GITHUB_TOKEN');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
  const payload = await response.json();
  if (payload.errors) throw new Error(`GitHub API errors: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

const COLLECTION_FIELDS = `
  totalCommitContributions totalPullRequestContributions totalIssueContributions
  contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }`;

async function fetchProfile() {
  const base = await graphql(
    `query($login:String!){ user(login:$login){
       createdAt followers{totalCount}
       repositories(ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, first:100){
         totalCount
         nodes{ stargazerCount languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name } } } }
       } } }`,
    { login: LOGIN },
  );
  const user = base.user;
  const now = new Date();
  const firstYear = new Date(user.createdAt).getUTCFullYear();
  const years = Array.from({ length: now.getUTCFullYear() - firstYear + 1 }, (_, i) => firstYear + i);
  const aliases = years
    .map((year) => {
      const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
      return `y${year}: contributionsCollection(from:"${year}-01-01T00:00:00Z", to:"${to}"){ ${COLLECTION_FIELDS} }`;
    })
    .join('\n');
  const contributions = await graphql(`query($login:String!){ user(login:$login){ ${aliases} } }`, { login: LOGIN });
  return { user, collections: years.map((year) => contributions.user[`y${year}`]), createdAt: new Date(user.createdAt) };
}

function computeStreaks(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = { length: 0, start: null, end: null };
  let run = { length: 0, start: null, end: null };
  for (const day of sorted) {
    run = day.count > 0
      ? { length: run.length + 1, start: run.start ?? day.date, end: day.date }
      : { length: 0, start: null, end: null };
    if (run.length > longest.length) longest = run;
  }
  // The current day may still be empty; do not break the streak for it.
  const trimmed = sorted.at(-1)?.count === 0 ? sorted.slice(0, -1) : sorted;
  let current = { length: 0, start: null, end: null };
  for (let i = trimmed.length - 1; i >= 0 && trimmed[i].count > 0; i -= 1) {
    current = { length: current.length + 1, start: trimmed[i].date, end: current.end ?? trimmed[i].date };
  }
  return { current, longest };
}

const formatNumber = (n) => n.toLocaleString('en-US');
const formatDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const formatRange = ({ start, end }) => (start ? (start === end ? formatDay(start) : `${formatDay(start)} - ${formatDay(end)}`) : 'No streak yet');
const today = () => new Date().toISOString().slice(0, 10);

function collectStats({ user, collections, createdAt }) {
  const days = collections.flatMap((c) =>
    c.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))));
  const uniqueDays = [...new Map(days.map((d) => [d.date, d])).values()];
  const sum = (key) => collections.reduce((total, c) => total + c[key], 0);
  const languageBytes = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      languageBytes.set(node.name, (languageBytes.get(node.name) ?? 0) + size);
    }
  }
  const totalBytes = [...languageBytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...languageBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LANGUAGES)
    .map(([name, bytes]) => ({ name, percent: (bytes / totalBytes) * 100 }));
  return {
    totalContributions: collections.reduce((t, c) => t + c.contributionCalendar.totalContributions, 0),
    commits: sum('totalCommitContributions'),
    pullRequests: sum('totalPullRequestContributions'),
    issues: sum('totalIssueContributions'),
    repos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((t, r) => t + r.stargazerCount, 0),
    followers: user.followers.totalCount,
    since: createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    streaks: computeStreaks(uniqueDays),
    languages,
    days: uniqueDays.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---------- rendering ----------

const bigTile = (x, y, w, h, fill, value, label, sub) =>
  block(x, y, w, h, fill, { offset: 7 }) +
  `<text x="${x + 24}" y="${y + 78}" font-size="68" fill="${C.ink}">${esc(value)}</text>` +
  `<text x="${x + 24}" y="${y + 112}" font-size="17" fill="${C.ink}" letter-spacing="1">${esc(label)}</text>` +
  `<text x="${x + 24}" y="${y + 138}" font-size="14" fill="${C.ink}" opacity=".7">${esc(sub)}</text>`;

const smallTile = (x, y, w, h, fill, value, label) =>
  block(x, y, w, h, fill, { offset: 5, strokeWidth: 3 }) +
  `<text x="${x + w / 2}" y="${y + 52}" font-size="34" fill="${C.ink}" text-anchor="middle">${esc(value)}</text>` +
  `<text x="${x + w / 2}" y="${y + 80}" font-size="13" fill="${C.ink}" text-anchor="middle" letter-spacing="1">${esc(label)}</text>`;

function renderStats(stats) {
  const width = 1000;
  const height = 372;
  const frame = canvas(width, height);
  const pad = 28;
  const gap = 28;
  const bigW = (width - pad * 2 - gap * 2) / 3;
  const smallGap = 16;
  const smallW = (width - pad * 2 - smallGap * 5) / 6;
  const bigTiles = [
    [C.pink, formatNumber(stats.totalContributions), 'TOTAL CONTRIBUTIONS', `${stats.since} - Present`],
    [C.yellow, formatNumber(stats.streaks.current.length), 'CURRENT STREAK (DAYS)', formatRange(stats.streaks.current)],
    [C.teal, formatNumber(stats.streaks.longest.length), 'LONGEST STREAK (DAYS)', formatRange(stats.streaks.longest)],
  ];
  const smallTiles = [
    [C.blue, stats.commits, 'COMMITS'],
    [C.orange, stats.pullRequests, 'PULL REQUESTS'],
    [C.purple, stats.issues, 'ISSUES'],
    [C.yellow, stats.repos, 'PUBLIC REPOS'],
    [C.pink, stats.stars, 'STARS'],
    [C.teal, stats.followers, 'FOLLOWERS'],
  ];
  const body = [
    frame.back,
    ...bigTiles.map(([fill, value, label, sub], i) => bigTile(pad + i * (bigW + gap), pad, bigW, 166, fill, value, label, sub)),
    ...smallTiles.map(([fill, value, label], i) => smallTile(pad + i * (smallW + smallGap), 236, smallW, 96, fill, formatNumber(value), label)),
    `<text x="${width - pad}" y="${height - 12}" font-size="11" fill="${C.ink}" opacity=".55" text-anchor="end">updated ${today()}</text>`,
    frame.front,
  ].join('');
  return svgDocument({ width, height, title: `GitHub stats for ${LOGIN}`, body });
}

function renderLanguages(stats) {
  const width = 1000;
  const rowH = 50;
  const top = 40;
  const height = top + stats.languages.length * rowH + 44;
  const frame = canvas(width, height);
  const trackX = 200;
  const trackW = 560;
  const topPercent = stats.languages[0].percent;
  const rows = stats.languages.map(({ name, percent }, i) => {
    const y = top + i * rowH;
    const fill = PALETTE[i % PALETTE.length];
    const barW = Math.round(Math.max(14, (percent / topPercent) * trackW));
    return `<text x="40" y="${y + 27}" font-size="20" fill="${C.ink}">${esc(name)}</text>` +
      `<rect x="${trackX}" y="${y}" width="${trackW}" height="34" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` +
      block(trackX, y, barW, 34, fill, { offset: 0, strokeWidth: 3 }) +
      `<text x="${trackX + trackW + 20}" y="${y + 27}" font-size="20" fill="${C.ink}">${percent.toFixed(1)}%</text>`;
  });
  const body = [
    frame.back,
    ...rows,
    float(1, triangle(925, 80, 70, C.yellow, 12)),
    float(2, ring(960, 170, 20, C.pink, 6)),
    spin(plus(900, 220, 14, C.orange)),
    float(3, halfCircle(930, height - 70, 34, C.teal, -10)),
    `<text x="${width - 28}" y="${height - 12}" font-size="11" fill="${C.ink}" opacity=".55" text-anchor="end">by code size across public repos, updated ${today()}</text>`,
    frame.front,
  ].join('');
  return svgDocument({ width, height, title: `Top languages of ${LOGIN}`, body });
}

function weeklyTotals(days) {
  const totals = Array(ACTIVITY_WEEKS).fill(0);
  const end = Date.parse(`${today()}T00:00:00Z`);
  for (const { date, count } of days) {
    const age = Math.floor((end - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
    const week = Math.floor(age / 7);
    if (age >= 0 && week < ACTIVITY_WEEKS) totals[ACTIVITY_WEEKS - 1 - week] += count;
  }
  return totals;
}

function renderActivity(stats) {
  const width = 1000;
  const height = 320;
  const frame = canvas(width, height);
  const totals = weeklyTotals(stats.days);
  const maxTotal = Math.max(...totals, 1);
  const chartX = 48;
  const chartW = 904;
  const baseY = 268;
  const chartH = 170;
  const slot = chartW / ACTIVITY_WEEKS;
  const barW = slot - 8;
  const bars = totals.map((total, i) => {
    const h = total === 0 ? 4 : Math.round(Math.max(8, (total / maxTotal) * chartH));
    const x = Math.round((chartX + i * slot) * 10) / 10;
    return block(x, baseY - h, barW, h, PALETTE[i % PALETTE.length], { offset: 0, strokeWidth: 2.5 });
  });
  const body = [
    frame.back,
    block(40, 22, 330, 40, C.pink, { rx: 20, offset: 5, strokeWidth: 3 }),
    `<text x="62" y="49" font-size="18" fill="${C.ink}">CONTRIBUTIONS PER WEEK (${ACTIVITY_WEEKS}W)</text>`,
    `<text x="${width - 40}" y="48" font-size="16" fill="${C.ink}" text-anchor="end">peak week: ${formatNumber(maxTotal)}</text>`,
    `<line x1="${chartX - 6}" y1="${baseY}" x2="${chartX + chartW}" y2="${baseY}" stroke="${C.ink}" stroke-width="4"/>`,
    ...bars,
    `<text x="${chartX}" y="${baseY + 26}" font-size="13" fill="${C.ink}">${ACTIVITY_WEEKS} weeks ago</text>`,
    `<text x="${chartX + chartW}" y="${baseY + 26}" font-size="13" fill="${C.ink}" text-anchor="end">this week</text>`,
    squiggle(430, 42, 200, C.blue, { amp: 6, step: 12, strokeWidth: 4 }),
    `<text x="${width / 2}" y="${height - 10}" font-size="11" fill="${C.ink}" opacity=".55" text-anchor="middle">updated ${today()}</text>`,
    frame.front,
  ].join('');
  return svgDocument({ width, height, title: `Weekly contributions of ${LOGIN}`, body });
}

const profile = await fetchProfile();
const stats = collectStats(profile);
await mkdir(ASSETS_DIR, { recursive: true });
await Promise.all([
  writeFile(`${ASSETS_DIR}stats.svg`, renderStats(stats)),
  writeFile(`${ASSETS_DIR}languages.svg`, renderLanguages(stats)),
  writeFile(`${ASSETS_DIR}activity.svg`, renderActivity(stats)),
]);
console.log(`stats: ${stats.totalContributions} contributions, streak ${stats.streaks.current.length}/${stats.streaks.longest.length}`);
