import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['anthropicApiKey']).then((result) => {
      const key = result.anthropicApiKey as string | undefined;
      if (key) {
        setHasKey(true);
        setApiKey(key);
      }
    });
  }, []);

  function save() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    chrome.storage.local.set({ anthropicApiKey: trimmed }).then(() => {
      setHasKey(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      console.log('[LLB popup] saved key prefix:', trimmed.slice(0, 20) + '...');
    });
  }

  function clear() {
    chrome.storage.local.remove(['anthropicApiKey']).then(() => {
      setApiKey('');
      setHasKey(false);
    });
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>LinkedIn Blocker</h2>

      <div style={styles.modeRow}>
        <span style={{ ...styles.dot, background: hasKey ? '#22c55e' : '#f59e0b' }} />
        <span style={styles.modeLabel}>
          {hasKey ? 'Claude API (LLM mode)' : 'Heuristic mode'}
        </span>
      </div>

      <label style={styles.label}>Anthropic API key</label>
      <input
        type="password"
        value={apiKey}
        onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
        placeholder="sk-ant-..."
        style={styles.input}
      />

      <div style={styles.buttonRow}>
        <button onClick={save} style={styles.saveBtn} disabled={!apiKey.trim()}>
          {saved ? 'Saved ✓' : 'Save'}
        </button>
        {hasKey && (
          <button onClick={clear} style={styles.clearBtn}>
            Clear
          </button>
        )}
      </div>

      <p style={styles.hint}>
        Get a key at{' '}
        <a href="https://console.anthropic.com" target="_blank" style={styles.link}>
          console.anthropic.com
        </a>
        . Without a key the heuristic detector runs instead.
      </p>
    </div>
  );
}

const styles: Record<string, preact.JSX.CSSProperties> = {
  container: {
    width: 280,
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 13,
    color: '#1a1a1a',
  },
  title: { margin: '0 0 12px', fontSize: 16, fontWeight: 600 },
  modeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  modeLabel: { fontSize: 12, color: '#555' },
  label: { display: 'block', marginBottom: 4, fontWeight: 500 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  buttonRow: { display: 'flex', gap: 8, marginBottom: 10 },
  saveBtn: {
    flex: 1,
    padding: '6px 0',
    background: '#0a66c2',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  clearBtn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  hint: { margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.5 },
  link: { color: '#0a66c2' },
};

render(<App />, document.getElementById('root')!);
