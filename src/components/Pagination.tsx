/**
 * Pagination — compact prev/next + numbered page controls.
 *
 * Shows at most 7 page buttons (first, last, ±2 around current, ellipsis).
 * Hidden automatically when total pages ≤ 1.
 *
 * Usage:
 *   <Pagination
 *     page={page}           // 1-based current page
 *     totalPages={total}    // total number of pages
 *     onPageChange={setPage}
 *   />
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional: show total result count. */
  totalResults?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  totalResults,
}) => {
  if (totalPages <= 1) return null;

  /** Build the list of page tokens to show. Tokens are page numbers or null (= ellipsis). */
  const buildTokens = (): (number | null)[] => {
    const tokens: (number | null)[] = [];
    const delta = 2; // pages shown around current

    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    tokens.push(1);
    if (left > 2) tokens.push(null); // left ellipsis

    for (let p = left; p <= right; p++) tokens.push(p);

    if (right < totalPages - 1) tokens.push(null); // right ellipsis
    if (totalPages > 1) tokens.push(totalPages);

    return tokens;
  };

  const tokens = buildTokens();

  const btnBase: React.CSSProperties = {
    minWidth: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-mono)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
    padding: '0 6px',
  };

  const activeBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: 'var(--accent-primary)',
    borderColor: 'var(--accent-primary)',
    color: '#fff',
    fontWeight: 700,
  };

  const disabledStyle: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginTop: '0.5rem',
      }}
    >
      {/* Result count (optional) */}
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {totalResults !== undefined
          ? `${totalResults.toLocaleString()} result${totalResults !== 1 ? 's' : ''}`
          : `Page ${page} of ${totalPages}`}
      </span>

      {/* Page buttons */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Previous */}
        <button
          style={page <= 1 ? disabledStyle : btnBase}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {tokens.map((token, idx) =>
          token === null ? (
            <span key={`ellipsis-${idx}`} style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '0.82rem' }}>…</span>
          ) : (
            <button
              key={token}
              style={token === page ? activeBtnStyle : btnBase}
              onClick={() => onPageChange(token)}
              aria-current={token === page ? 'page' : undefined}
            >
              {token}
            </button>
          )
        )}

        {/* Next */}
        <button
          style={page >= totalPages ? disabledStyle : btnBase}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
