import React, { useState } from 'react';
import { Search, FileText, Calendar, Scale, Eye, AlertTriangle } from 'lucide-react';
import type { CaseInfo } from '../services/api';
import { apiService, ApiError } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Notification } from '../components/Notification';

interface CasesProps {
  mockUpdateKey: number;
  onOpenCase?: (c: CaseInfo) => void;
}

export const Cases: React.FC<CasesProps> = ({ onOpenCase }) => {
  const [searchParams, setSearchParams] = useState({ cnr: '', party: '', advocate: '', court: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseInfo | null>(null);
  // Controls mobile-only view switching: false = list, true = detail
  const [showDetail, setShowDetail] = useState(false);
  const { message, showToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const results = await apiService.searchCases(searchParams);
      setCases(results);
      if (results.length > 0) {
        setSelectedCase(results[0]);
        setShowDetail(false);
      } else {
        setSelectedCase(null);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        // CAPTCHA_FAILED is the most common live-mode error — surface it clearly
        setError(err.code === 'CAPTCHA_FAILED'
          ? 'The court portal CAPTCHA could not be solved. Please try again in a few seconds.'
          : err.message);
      } else {
        setError('An unexpected error occurred. Check the console for details.');
      }
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = (c: CaseInfo) => {
    if (onOpenCase) {
      onOpenCase(c);
    } else {
      setSelectedCase(c);
      setShowDetail(true);
    }
  };

  const handleViewPdf = (url: string | null | undefined, label: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      showToast(`PDF not available in mock mode — ${label}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Mobile back button (hidden on desktop via .mobile-only) ── */}
      {showDetail && (
        <button
          className="mobile-only glass-button-secondary"
          style={{ alignSelf: 'flex-start', height: '36px', padding: '0 1rem', fontSize: '0.85rem' }}
          onClick={() => setShowDetail(false)}
        >
          ← Back to Results
        </button>
      )}

      {/* ── Search form — hidden on mobile when detail is open ── */}
      <form
        onSubmit={handleSearch}
        className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
        style={{ padding: '1.25rem' }}
      >
        <div className="search-grid-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CNR Number</label>
            <input type="text" className="glass-input" placeholder="e.g. DLHC010023452024"
              value={searchParams.cnr}
              onChange={e => setSearchParams({ ...searchParams, cnr: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Party Name</label>
            <input type="text" className="glass-input" placeholder="Petitioner or Respondent"
              value={searchParams.party}
              onChange={e => setSearchParams({ ...searchParams, party: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Advocate Name</label>
            <input type="text" className="glass-input" placeholder="Advocate"
              value={searchParams.advocate}
              onChange={e => setSearchParams({ ...searchParams, advocate: e.target.value })} />
          </div>
          <button type="submit" className="glass-button" style={{ height: '42px' }}>
            <Search size={15} /> Search
          </button>
        </div>
      </form>

      {/* ── Main split: list + detail ── */}
      <div className="split-grid-narrow-wide">

        {/* Cases list — hidden on mobile when detail is open */}
        <div
          className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minHeight: '300px',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.6rem' }}>
            Case Matches ({cases.length})
          </h3>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className="badge badge-info pulse-glow">Loading Cases…</span>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '2rem 1rem' }}>
              <AlertTriangle size={36} color="var(--warning)" />
              <span style={{ fontSize: '0.88rem', color: 'var(--warning)', textAlign: 'center', lineHeight: 1.5 }}>{error}</span>
            </div>
          ) : cases.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '2rem 0' }}>
              <FileText size={36} />
              <span style={{ fontSize: '0.88rem' }}>Submit search criteria to query.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {cases.map(c => (
                <div
                  key={c.cnr}
                  onClick={() => handleSelectCase(c)}
                  style={{
                    padding: '0.875rem',
                    background: selectedCase?.cnr === c.cnr ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid',
                    borderColor: selectedCase?.cnr === c.cnr ? 'var(--accent-primary)' : 'var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div className="flex-between" style={{ marginBottom: '0.3rem', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.case_number}
                    </span>
                    <span className={`badge ${c.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {c.petitioner} vs. {c.respondent}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CNR: {c.cnr}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Case detail — always visible on desktop; shown on mobile only when showDetail=true */}
        <div
          className="glass-panel"
          style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {selectedCase ? (
            <>
              {/* Header */}
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                <div className="flex-between" style={{ gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedCase.case_number}</h3>
                  <div className={`badge ${selectedCase.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                    {selectedCase.status}
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  CNR: {selectedCase.cnr}
                </span>
              </div>

              {/* Parties + Advocates */}
              <div className="two-col-detail">
                <div className="glass-card">
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Parties</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Petitioner</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedCase.petitioner}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Respondent</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedCase.respondent}</div>
                    </div>
                  </div>
                </div>
                <div className="glass-card">
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Advocates &amp; Court</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Petitioner Counsel</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedCase.advocate_petitioner}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Respondent Counsel</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedCase.advocate_respondent}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bench */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Scale size={15} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Court &amp; Judges</span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedCase.court.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bench: {selectedCase.judges.join('; ')}</div>
              </div>

              {/* Timeline */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={15} color="var(--accent-secondary)" /> Orders &amp; Hearings
                </h4>
                <div className="timeline">
                  {selectedCase.orders.map((o, idx) => (
                    <div key={idx} className="timeline-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{o.order_type}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>By: {o.judge}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            {o.order_date}
                          </span>
                          <button
                            className="glass-button-secondary"
                            style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', height: 'auto' }}
                            onClick={() => handleViewPdf(o.pdf_url, o.order_date)}
                          >
                            <Eye size={11} /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedCase.next_hearing_date && (
                    <div className="timeline-item" style={{ paddingBottom: 0 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                        background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                        border: '1px dashed rgba(99, 102, 241, 0.3)',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Next Hearing Date</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scheduled listing</div>
                        </div>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                          {selectedCase.next_hearing_date}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '3rem 0' }}>
              <Scale size={44} />
              <span style={{ fontSize: '0.9rem' }}>Select a case record to inspect details.</span>
            </div>
          )}
        </div>
      </div>

      <Notification message={message} />
    </div>
  );
};
