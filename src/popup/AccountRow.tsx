import type { FlaggedAccount } from '../shared/types';
import type { JSX } from 'preact';

interface AccountRowProps {
  account: FlaggedAccount;
  onBlock: () => void;
  onDismiss: () => void;
}

const rowStyles: Record<string, JSX.CSSProperties> = {
  row: {
    padding: '10px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  topLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  nameLink: {
    color: '#1a1a1a',
    fontWeight: 600,
    fontSize: 13,
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 160,
    display: 'block',
  },
  peakScore: {
    color: '#0a66c2',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    background: '#f3f4f6',
    color: '#374151',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 10,
  },
  moreChips: {
    fontSize: 10,
    color: '#9ca3af',
    alignSelf: 'center',
  },
  actionRow: {
    display: 'flex',
    gap: 6,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  dismissBtn: {
    padding: '4px 10px',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
  },
  blockBtn: {
    padding: '4px 10px',
    background: '#fff',
    color: '#0a66c2',
    border: '1px solid #0a66c2',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
  },
};

export default function AccountRow({ account, onBlock, onDismiss }: Readonly<AccountRowProps>): JSX.Element {
  const activeSignals = Object.entries(account.signals)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);
  const visibleChips = activeSignals.slice(0, 4);
  const hiddenCount = activeSignals.length - visibleChips.length;

  return (
    <div style={rowStyles.row}>
      <div style={rowStyles.topLine}>
        <a
          href={account.authorProfileUrl}
          target="_blank"
          rel="noreferrer"
          style={rowStyles.nameLink}
        >
          {account.authorName}
        </a>
        <span style={rowStyles.peakScore}>Peak: {account.peakScore}</span>
      </div>

      <div style={rowStyles.meta}>
        <span>avg: {Math.round(account.compositeScore)}</span>
        <span>•</span>
        <span>{account.postCount} {account.postCount === 1 ? 'post' : 'posts'}</span>
      </div>

      <div style={rowStyles.chipRow}>
        {visibleChips.map((chip) => (
          <span key={chip} style={rowStyles.chip}>{chip}</span>
        ))}
        {hiddenCount > 0 && (
          <span style={rowStyles.moreChips}>+{hiddenCount} more</span>
        )}
      </div>

      <div style={rowStyles.actionRow}>
        <button onClick={onDismiss} style={rowStyles.dismissBtn}>Dismiss</button>
        <button onClick={onBlock} style={rowStyles.blockBtn}>Block</button>
      </div>
    </div>
  );
}
