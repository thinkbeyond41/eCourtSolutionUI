import React, { useState, useEffect } from 'react';
import { Search, Gavel, FileText, Download, ExternalLink } from 'lucide-react';
import type { Court, Judgment } from '../services/api';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Notification } from '../components/Notification';
import { Pagination } from '../components/Pagination';

interface JudgmentsProps {
  mockUpdateKey: number;
}

export const Judgments: React.FC<JudgmentsProps> = () => {
  const [searchParams, setSearchParams] = useState({ text: '', judge: '', year: '', court: '' });
  const [loading, setLoading] = useState(false);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [selectedJudgment, setSelectedJudgment] = useState<Judgment | null>(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // Controls mobile-only view switching
  const [showDetail, setShowDetail] = useState(false);
  const { message, showToast } = useToast();
  // Court dropdown — dynamically loaded from the API
  const [courts, setCourts] = useState<Court[]>([]);

  // Load courts on mount for the dynamic dropdown
  useEffect(() => {
    apiService.getCourts()
      .then(all => setCourts(all.filter(c => c.court_type === 'HIGH' || c.court_type === 'SUPREME')))
      .catch(console.error);
  }, []);

  const fetchPage = async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await apiService.searchJudgments(
        { ...searchParams, year: searchParams.year ? parseInt(searchParams.year) : undefined },
        targetPage,
      );
      setJudgments(result.items);
      setPage(result.page);
      setTotalResults(result.total);
      setTotalPages(result.total_pages);
      if (result.items.length > 0) {
        setSelectedJudgment(result.items[0]);
        setShowDetail(false);
      } else {
        setSelectedJudgment(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchPage(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchPage(newPage);
    // Scroll result list to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelect = (j: Judgment) => {
    setSelectedJudgment(j);
    setShowDetail(true);
  };

  const handleOpenPdf = (url: string | null | undefined, mode: 'download' | 'view') => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      showToast(mode === 'download'
        ? 'PDF download not available in mock mode.'
        : 'PDF viewer not available in mock mode.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Mobile back (hidden on desktop via .mobile-only) ── */}
      {showDetail && (
        <button
          className="mobile-only glass-button-secondary"
          style={{ alignSelf: 'flex-start', height: '36px', padding: '0 1rem', fontSize: '0.85rem' }}
          onClick={() => setShowDetail(false)}
        >
          ← Back to Results
        </button>
      )}

      {/* ── Search filters — hidden on mobile when detail is open ── */}
      <form
        onSubmit={handleSearch}
        className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
        style={{ padding: '1.25rem' }}
      >
        <div className="search-grid-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Full-Text / Phrase</label>
            <input type="text" className="glass-input" placeholder="e.g. fundamental rights"
              value={searchParams.text}
              onChange={e => setSearchParams({ ...searchParams, text: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Judge Name</label>
            <input type="text" className="glass-input" placeholder="e.g. Chandrachud"
              value={searchParams.judge}
              onChange={e => setSearchParams({ ...searchParams, judge: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Year</label>
            <input type="number" className="glass-input" placeholder="2024"
              value={searchParams.year}
              onChange={e => setSearchParams({ ...searchParams, year: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Court</label>
            <select
              className="glass-input"
              value={searchParams.court}
              onChange={e => setSearchParams({ ...searchParams, court: e.target.value })}
              style={{ height: '42px' }}
            >
              <option value="">All Courts</option>
              {courts.length > 0
                ? courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                : (
                  // Fallback options while courts are loading
                  <>
                    <option value="sci">Supreme Court of India</option>
                    <option value="delhi-hc">Delhi High Court</option>
                    <option value="bombay-hc">Bombay High Court</option>
                  </>
                )
              }
            </select>
          </div>
          <button type="submit" className="glass-button" style={{ height: '42px' }}>
            <Search size={15} /> Search
          </button>
        </div>
      </form>

      {/* ── Split: list + detail ── */}
      <div className="split-grid-narrow-wide">

        {/* Results list — hidden on mobile when detail is open */}
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
            {totalResults > 0
              ? `${totalResults.toLocaleString()} Judgment${totalResults !== 1 ? 's' : ''}`
              : `Judgments Found (${judgments.length})`}
          </h3>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className="badge badge-info pulse-glow">Querying S3 Archive…</span>
            </div>
          ) : judgments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '2rem 0' }}>
              <Gavel size={36} />
              <span style={{ fontSize: '0.88rem' }}>Enter keywords or filters to start.</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {judgments.map(j => (
                  <div
                    key={j.cnr}
                    onClick={() => handleSelect(j)}
                    style={{
                      padding: '0.875rem',
                      background: selectedJudgment?.cnr === j.cnr ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid',
                      borderColor: selectedJudgment?.cnr === j.cnr ? 'var(--accent-secondary)' : 'var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '0.3rem', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{j.decision_date}</span>
                      <span className={`badge ${j.source === 'ARCHIVE' ? 'badge-success' : 'badge-info'}`}>
                        {j.source === 'ARCHIVE' ? 'Archive' : 'Live'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.2rem' }}>{j.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{j.court.name}</div>
                  </div>
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                totalResults={totalResults}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>

        {/* Judgment detail — always visible on desktop */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {selectedJudgment ? (
            <>
              {/* ── Header ─────────────────────────────────────── */}
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                {/* Source + date row */}
                <div className="flex-between" style={{ marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className={`badge ${selectedJudgment.source === 'ARCHIVE' ? 'badge-success' : 'badge-info'}`}>
                    {selectedJudgment.source}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {selectedJudgment.decision_date}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {selectedJudgment.title}
                </h3>

                {/* Petitioner vs Respondent */}
                {(selectedJudgment.petitioner || selectedJudgment.respondent) && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap',
                    background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem 0.875rem', marginBottom: '0.75rem',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Petitioner</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedJudgment.petitioner || '—'}</div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.9rem 0.25rem 0', flexShrink: 0 }}>vs.</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Respondent</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedJudgment.respondent || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Citations */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedJudgment.citation && (
                    <span className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                      {selectedJudgment.citation}
                    </span>
                  )}
                  {selectedJudgment.neutral_citation && (
                    <span className="badge badge-warning" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                      {selectedJudgment.neutral_citation}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Court & Bench ───────────────────────────────── */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {/* Court name + type */}
                <div className="flex-between" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Court</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedJudgment.court.name}</div>
                    {selectedJudgment.court.state_name && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {selectedJudgment.court.state_name}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${
                    selectedJudgment.court.court_type === 'SUPREME' ? 'badge-danger' :
                    selectedJudgment.court.court_type === 'HIGH'    ? 'badge-success' : 'badge-info'
                  }`} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                    {selectedJudgment.court.court_type}
                  </span>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-glass)' }} />

                {/* Bench + Author */}
                <div className="two-col-detail" style={{ gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Presiding Bench</div>
                    {selectedJudgment.judge.length > 0
                      ? selectedJudgment.judge.map((j, i) => (
                          <div key={i} style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.5 }}>{j}</div>
                        ))
                      : <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Not recorded</div>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Author of Judgment</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      {selectedJudgment.author_judge || <span style={{ color: 'var(--text-muted)' }}>Not recorded</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Case details ────────────────────────────────── */}
              <div className="glass-card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>CNR</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {selectedJudgment.cnr}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Case Type</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {selectedJudgment.case_type || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Disposal</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                      {selectedJudgment.disposal_nature || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PDF ─────────────────────────────────────────── */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
              }}>
                <FileText size={36} color={selectedJudgment.pdf_url ? 'var(--accent-primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.95rem' }}>Judgment Document</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedJudgment.pdf_url
                      ? 'PDF available — click to download or open'
                      : 'PDF not yet indexed for this record'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', flexShrink: 0 }}>
                  <button
                    className="glass-button"
                    style={{ opacity: selectedJudgment.pdf_url ? 1 : 0.45, cursor: selectedJudgment.pdf_url ? 'pointer' : 'not-allowed' }}
                    onClick={() => handleOpenPdf(selectedJudgment.pdf_url, 'download')}
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    className="glass-button-secondary"
                    style={{ opacity: selectedJudgment.pdf_url ? 1 : 0.45, cursor: selectedJudgment.pdf_url ? 'pointer' : 'not-allowed' }}
                    onClick={() => handleOpenPdf(selectedJudgment.pdf_url, 'view')}
                  >
                    <ExternalLink size={14} /> Open
                  </button>
                </div>
              </div>

              {/* ── Languages ───────────────────────────────────── */}
              {(selectedJudgment.available_languages ?? []).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    Available in:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(selectedJudgment.available_languages ?? []).map(lang => (
                      <span key={lang} className="badge badge-info" style={{ textTransform: 'none' }}>{lang}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '3rem 0' }}>
              <Gavel size={44} />
              <span style={{ fontSize: '0.9rem' }}>Select a judgment to view details.</span>
            </div>
          )}
        </div>
      </div>

      <Notification message={message} />
    </div>
  );
};
