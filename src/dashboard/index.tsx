import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { FlaggedAccount, DailyStats, StoredPost } from '../shared/types';
import { buildJsonExport, buildCsvExport, buildPostsCsvExport, deriveCleanseCount, filterCleansed } from './dataManagement';

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
  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [cleanseDate, setCleanseDate] = useState<string>('');
  const [cleansePreview, setCleansePreview] = useState<{ accountCount: number; postCount: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['flaggedAccounts', 'dailyStats', 'storedPosts', 'dismissedAccounts']).then((result) => {
      const accts = Object.values(
        (result.flaggedAccounts ?? {}) as Record<string, FlaggedAccount>
      );
      setAccounts(accts);
      setStats((result.dailyStats ?? []) as DailyStats[]);
      setPosts((result.storedPosts ?? []) as StoredPost[]);
      setDismissed((result.dismissedAccounts ?? []) as string[]);
    }).catch(() => {
      setLoadError('Could not load data. Try reopening the dashboard.');
    });
  }, []);

  function triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJson(): void {
    const today = new Date().toISOString().slice(0, 10);
    triggerDownload(buildJsonExport(accounts, posts), `linkedin-blocker-${today}.json`, 'application/json');
  }

  function handleExportCsv(): void {
    const today = new Date().toISOString().slice(0, 10);
    triggerDownload(buildCsvExport(accounts), `linkedin-blocker-${today}.csv`, 'text/csv');
  }

  function handleExportPostsCsv(): void {
    const today = new Date().toISOString().slice(0, 10);
    triggerDownload(buildPostsCsvExport(posts), `linkedin-blocker-posts-${today}.csv`, 'text/csv');
  }

  async function handleClean(): Promise<void> {
    if (!cleanseDate || !cleansePreview) return;
    const { accountCount, postCount } = cleansePreview;
    const ok = window.confirm(
      `Delete ${accountCount} account(s), ${postCount} post(s), and all dismissed entries? This cannot be undone.`
    );
    if (!ok) return;
    const { keptAccounts, keptPosts } = filterCleansed(accounts, posts, cleanseDate);
    await chrome.storage.local.set({ flaggedAccounts: keptAccounts, storedPosts: keptPosts, dismissedAccounts: [] });
    setAccounts(Object.values(keptAccounts));
    setPosts(keptPosts);
    setDismissed([]);
    setCleanseDate('');
    setCleansePreview(null);
  }

  // All-time totals derived from flaggedAccounts (complete history)
  const totalHiddenAllTime = accounts.reduce((s, a) => s + a.hiddenPostUrns.length, 0);

  // Recent activity from dailyStats (only available since Phase 6 deployment)
  const cutoff = cutoffDate(timeWindow);
  const windowStats = stats.filter(d => d.date >= cutoff);
  const recentSeen = windowStats.reduce((s, d) => s + d.seen, 0);
  const recentHidden = windowStats.reduce((s, d) => s + d.hidden, 0);
  const recentPct = recentSeen > 0 ? ((recentHidden / recentSeen) * 100).toFixed(1) : null;

  // Profile bot rate — unique profiles seen in window that are flagged (INSIGHT-02)
  const seenUnion = new Set<string>();
  for (const d of windowStats) {
    for (const id of (d.seenProfileIds ?? [])) {
      seenUnion.add(id);
    }
  }
  const pendingIds = new Set(
    accounts
      .filter(a => a.status !== 'dismissed' && !dismissed.includes(a.authorId))
      .map(a => a.authorId)
  );
  const botProfileCount = [...seenUnion].filter(id => pendingIds.has(id)).length;
  const profileBotRate = seenUnion.size > 0
    ? ((botProfileCount / seenUnion.size) * 100).toFixed(1)
    : null;

  // Signal breakdown uses ALL accounts (full history) — independent of time window
  let aiLanguageCount = 0;
  let botBehaviourCount = 0;
  for (const acct of accounts) {
    const keys = Object.keys(acct.signals).filter(k => (acct.signals[k] ?? 0) > 0);
    if (keys.some(k => AI_LANGUAGE_SIGNALS.has(k))) aiLanguageCount++;
    if (keys.some(k => !AI_LANGUAGE_SIGNALS.has(k))) botBehaviourCount++;
  }
  const base = accounts.length || 1;
  const aiPct = Math.round((aiLanguageCount / base) * 100);
  const botPct = Math.round((botBehaviourCount / base) * 100);

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
        <div style={s.statLabel}>Posts hidden — all time</div>
        <div style={s.statValue}>{totalHiddenAllTime}</div>
        <div style={s.statSub}>across {accounts.length} flagged accounts</div>
        {recentPct !== null && (
          <div style={s.statSub}>
            {recentPct}% of posts flagged in last {timeWindow} days ({recentHidden} of {recentSeen})
          </div>
        )}
        {profileBotRate !== null ? (
          <div style={s.statSub}>
            Profile bot rate: {profileBotRate}% ({botProfileCount} of {seenUnion.size} unique profiles in last {timeWindow} days)
          </div>
        ) : (
          <div style={s.statSub}>
            Profile bot rate: — (browse LinkedIn to collect profile data)
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={s.statLabel}>Signal categories — all time ({accounts.length} accounts)</div>
        <div style={s.barRow}>
          <span style={s.barLabel}>AI language</span>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, ...s.barAI, width: `${aiPct}%` }} />
          </div>
          <span style={s.barCount}>{aiLanguageCount} ({aiPct}%)</span>
        </div>
        <div style={s.barRow}>
          <span style={s.barLabel}>Bot behaviour</span>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, ...s.barBot, width: `${botPct}%` }} />
          </div>
          <span style={s.barCount}>{botBehaviourCount} ({botPct}%)</span>
        </div>
        <div style={s.categoryNote}>
          % of all {accounts.length} flagged accounts. Accounts may trigger both categories.
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHeading}>Data management</div>
        {loadError && <div style={s.errorMsg}>{loadError}</div>}
        <div style={s.statLabel}>Export data</div>
        {accounts.length === 0
          ? <div style={s.statSub}>No flagged accounts yet — browse LinkedIn to collect data.</div>
          : (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={s.actionBtn} onClick={handleExportJson}>Export JSON</button>
              <button style={s.actionBtn} onClick={handleExportCsv}>Export CSV</button>
              <button style={s.actionBtn} onClick={handleExportPostsCsv}>Export Posts CSV</button>
            </div>
          )
        }
        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
        <div style={s.statLabel}>Cleanse data before:</div>
        <input
          type="date"
          style={{ marginTop: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          value={cleanseDate}
          onInput={(e) => {
            const d = (e.target as HTMLInputElement).value;
            setCleanseDate(d);
            if (d) {
              setCleansePreview(deriveCleanseCount(accounts, posts, d));
            } else {
              setCleansePreview(null);
            }
          }}
        />
        {cleansePreview !== null && (
          <div style={s.statSub}>Will remove {cleansePreview.accountCount} account(s) and {cleansePreview.postCount} post(s)</div>
        )}
        <button
          style={cleanseDate ? s.destructiveBtn : s.destructiveBtnDisabled}
          disabled={!cleanseDate}
          onClick={handleClean}
        >Confirm cleanse</button>
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
  cardHeading: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 },
  errorMsg: { fontSize: 12, color: '#dc2626', marginBottom: 8 },
  actionBtn: {
    padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 6,
    background: '#fff', cursor: 'pointer', fontSize: 13,
  },
  destructiveBtn: {
    padding: '6px 16px', border: 'none', borderRadius: 6,
    background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, marginTop: 8,
  },
  destructiveBtnDisabled: {
    padding: '6px 16px', border: 'none', borderRadius: 6,
    background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', fontSize: 13, marginTop: 8,
  },
};

render(<App />, document.getElementById('root')!);
