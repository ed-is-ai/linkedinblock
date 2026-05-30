import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { FlaggedAccount, DailyStats } from '../shared/types';

const AI_LANGUAGE_SIGNALS = new Set([
  'listicle', 'cta', 'buzzwords', 'em-dash', 'ai-vocab',
  'generic-comments', 'hook-story', 'motivational', 'template',
]);

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function App() {
  const [timeWindow, setTimeWindow] = useState<7 | 30>(7);
  const [accounts, setAccounts] = useState<FlaggedAccount[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    chrome.storage.local.get(['flaggedAccounts', 'dailyStats']).then((result) => {
      const accts = Object.values(
        (result.flaggedAccounts ?? {}) as Record<string, FlaggedAccount>
      );
      setAccounts(accts);
      setStats((result.dailyStats ?? []) as DailyStats[]);
    });
  }, []);

  // Aggregate daily stats for selected window
  const cutoff = cutoffDate(timeWindow);
  const windowStats = stats.filter(d => d.date >= cutoff);
  const totalSeen = windowStats.reduce((s, d) => s + d.seen, 0);
  const totalHidden = windowStats.reduce((s, d) => s + d.hidden, 0);
  const pct = totalSeen > 0 ? ((totalHidden / totalSeen) * 100).toFixed(1) : '—';

  // Signal breakdown from flaggedAccounts in window
  const windowAccounts = accounts.filter(
    a => new Date(a.firstSeenAt).toISOString().slice(0, 10) >= cutoff
  );
  let aiLanguagePosts = 0;
  let botBehaviourPosts = 0;
  for (const acct of windowAccounts) {
    const keys = Object.keys(acct.signals).filter(k => (acct.signals[k] ?? 0) > 0);
    const postCount = acct.hiddenPostUrns.length;
    if (keys.some(k => AI_LANGUAGE_SIGNALS.has(k))) aiLanguagePosts += postCount;
    if (keys.some(k => !AI_LANGUAGE_SIGNALS.has(k))) botBehaviourPosts += postCount;
  }
  const aiPct = totalSeen > 0 ? Math.round((aiLanguagePosts / totalSeen) * 100) : 0;
  const botPct = totalSeen > 0 ? Math.round((botBehaviourPosts / totalSeen) * 100) : 0;

  return (
    <div style={s.page}>
      <h1 style={s.heading}>LinkedIn Blocker — Feed Health</h1>

      <div style={s.toggleRow}>
        <button
          style={timeWindow === 7 ? s.toggleActive : s.toggle}
          onClick={() => setTimeWindow(7)}
        >7 days</button>
        <button
          style={timeWindow === 30 ? s.toggleActive : s.toggle}
          onClick={() => setTimeWindow(30)}
        >30 days</button>
      </div>

      <div style={s.card}>
        <div style={s.statLabel}>Posts flagged</div>
        <div style={s.statValue}>{pct}{pct !== '—' ? '%' : ''}</div>
        <div style={s.statSub}>
          {totalHidden} hidden out of {totalSeen} seen
        </div>
      </div>

      <div style={s.card}>
        <div style={s.statLabel}>Signal categories ({windowAccounts.length} accounts)</div>
        <div style={s.barRow}>
          <span style={s.barLabel}>AI language</span>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, ...s.barAI, width: `${aiPct}%` }} />
          </div>
          <span style={s.barCount}>{aiLanguagePosts} posts ({aiPct}%)</span>
        </div>
        <div style={s.barRow}>
          <span style={s.barLabel}>Bot behaviour</span>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, ...s.barBot, width: `${botPct}%` }} />
          </div>
          <span style={s.barCount}>{botBehaviourPosts} posts ({botPct}%)</span>
        </div>
        <div style={s.categoryNote}>
          % of all {totalSeen} posts seen in this window. Accounts may trigger both categories.
        </div>
      </div>
    </div>
  );
}

const s: Record<string, import('preact').JSX.CSSProperties> = {
  page: {
    maxWidth: 640,
    margin: '40px auto',
    padding: '0 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1a1a1a',
  },
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  toggleRow: { display: 'flex', gap: 8, marginBottom: 24 },
  toggle: {
    padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 20,
    background: '#fff', cursor: 'pointer', fontSize: 13,
  },
  toggleActive: {
    padding: '6px 16px', border: '1px solid #0a66c2', borderRadius: 20,
    background: '#0a66c2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '20px 24px', marginBottom: 16,
  },
  statLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  statValue: { fontSize: 40, fontWeight: 700, color: '#0a66c2', lineHeight: 1.1 },
  statSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  barRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  barLabel: { fontSize: 12, width: 100, flexShrink: 0 },
  barTrack: {
    flex: 1, height: 12, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6, transition: 'width 0.3s' },
  barAI: { background: '#0a66c2' },
  barBot: { background: '#f59e0b' },
  barCount: { fontSize: 12, width: 100, textAlign: 'right' as const, flexShrink: 0 },
  categoryNote: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
};

render(<App />, document.getElementById('root')!);
