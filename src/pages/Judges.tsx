import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, ChevronRight, BarChart2, BookOpen, Scale, Building2, Clock, Star, Filter, X, ExternalLink } from 'lucide-react';
import type { Judge, Judgment, Court, CaseInfo } from '../services/api';
import { apiService } from '../services/api';
import { Pagination } from '../components/Pagination';

interface JudgesProps {
  mockUpdateKey: number;
  initialSearch?: string;
  onInitialSearchConsumed?: () => void;
  onOpenCase?: (c: CaseInfo) => void;
}

// Derive initials from a name string
function initials(name: string): string {
  return name
    .replace(/^Justice\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'var(--accent-primary)', 'var(--accent-secondary)', 'var(--info)',
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Pill/chip used in filter sections
const Chip: React.FC<{
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.3rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      border: active
        ? '1px solid var(--accent-primary)'
        : '1px solid var(--border-glass)',
      background: active
        ? 'rgba(99,102,241,0.18)'
        : 'rgba(255,255,255,0.04)',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
      transition: 'var(--transition-fast)',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    {count !== undefined && (
      <span style={{
        fontSize: '0.68rem',
        fontWeight: 600,
        background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.12)',
        color: active ? '#fff' : 'var(--text-muted)',
        borderRadius: '999px',
        padding: '0 0.35rem',
        lineHeight: '1.5',
      }}>
        {count.toLocaleString()}
      </span>
    )}
  </button>
);

export const Judges: React.FC<JudgesProps> = ({
  initialSearch = '',
  onInitialSearchConsumed,
  onOpenCase,
}) => {
  const [searchName, setSearchName]     = useState('');
  const [courtFilter, setCourtFilter]   = useState('');
  const [showRetired, setShowRetired]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [judges, setJudges]             = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [judgments, setJudgments]       = useState<Judgment[]>([]);
  const [courts, setCourts]             = useState<Court[]>([]);
  const [page, setPage]                 = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [showDetail, setShowDetail]     = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  // active case-type filter in profile view
  const [activeCaseType, setActiveCaseType] = useState<string | null>(null);

  useEffect(() => {
    apiService.getCourts().then(setCourts).catch(console.error);
  }, []);

  // Auto-run search when navigated here from a case detail (e.g. clicked judge name)
  useEffect(() => {
    if (!initialSearch) return;
    setSearchName(initialSearch);
    onInitialSearchConsumed?.();
    // Run immediately with the incoming query (don't rely on searchName state settling)
    setLoading(true);
    apiService.searchJudges({ name: initialSearch }, 1).then(result => {
      setJudges(result.items);
      setPage(result.page);
      setTotalResults(result.total);
      setTotalPages(result.total_pages);
      if (result.items.length > 0) {
        handleSelect(result.items[0]);
      }
    }).catch(console.error).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  const fetchPage = useCallback(async (targetPage: number, overrides?: { name?: string; court?: string }) => {
    setLoading(true);
    try {
      const result = await apiService.searchJudges(
        {
          name: overrides?.name ?? searchName,
          court: (overrides?.court ?? courtFilter) || undefined,
        },
        targetPage,
      );
      setJudges(result.items);
      setPage(result.page);
      setTotalResults(result.total);
      setTotalPages(result.total_pages);
      if (result.items.length > 0) {
        const first = result.items[0];
        setSelectedJudge(first);
        setShowDetail(false);
        setActiveCaseType(null);
        const res = await apiService.getJudgeJudgments(first.id);
        setJudgments(Array.isArray(res) ? res : []);
      } else {
        setSelectedJudge(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchName, courtFilter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchPage(1);
  };

  const handleSelect = async (judge: Judge) => {
    setSelectedJudge(judge);
    setShowDetail(true);
    setActiveCaseType(null);
    try {
      const res = await apiService.getJudgeJudgments(judge.id);
      setJudgments(res);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredJudges = showRetired ? judges : judges.filter(j => j.is_active);

  // Courts for filter dropdown — HCs + SCI
  const courtOptions = courts.filter(c => c.court_type === 'SUPREME' || c.court_type === 'HIGH');

  // Filtered judgments by active case type
  const visibleJudgments = activeCaseType
    ? judgments.filter(j => (j.case_type || '').toLowerCase().includes(activeCaseType.toLowerCase()))
    : judgments;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Mobile back */}
      {showDetail && (
        <button
          className="mobile-only glass-button-secondary"
          style={{ alignSelf: 'flex-start', height: '36px', padding: '0 1rem', fontSize: '0.85rem' }}
          onClick={() => setShowDetail(false)}
        >
          ← Back to Results
        </button>
      )}

      {/* Search + filters bar */}
      <form
        onSubmit={handleSearch}
        className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
        style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
      >
        {/* Row 1: search + toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              type="text"
              className="glass-input"
              placeholder="Search judges by name (e.g. Justice D.Y. Chandrachud)"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={17} color="var(--text-muted)"
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <button
            type="button"
            className="glass-button-secondary"
            style={{ height: '44px', padding: '0 1rem', fontSize: '0.85rem', gap: '0.5rem' }}
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter size={15} /> Filters {showFilters ? <X size={13} /> : null}
          </button>
          <button type="submit" className="glass-button" style={{ height: '44px' }}>Search</button>
        </div>

        {/* Row 2: collapsible filters */}
        {showFilters && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem', borderTop: '1px solid var(--border-glass)' }}>
            {/* Court select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Court</label>
              <select
                className="glass-input"
                value={courtFilter}
                onChange={e => setCourtFilter(e.target.value)}
                style={{ height: '38px', padding: '0 0.75rem' }}
              >
                <option value="">All Courts</option>
                {courtOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Active / All toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'flex-end' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Show</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['Active only', 'Include retired'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setShowRetired(opt === 'Include retired')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      border: '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      background: (opt === 'Include retired') === showRetired
                        ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                      color: (opt === 'Include retired') === showRetired
                        ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: (opt === 'Include retired') === showRetired ? 700 : 400,
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear */}
            {(courtFilter || showRetired) && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="glass-button-secondary"
                  style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => { setCourtFilter(''); setShowRetired(false); }}
                >
                  <X size={13} /> Clear
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Main split */}
      <div className="split-grid-narrow-wide">

        {/* Left list */}
        <div
          className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}
        >
          <div className="flex-between" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {totalResults > 0
                ? `${filteredJudges.length} of ${totalResults.toLocaleString()} Judge${totalResults !== 1 ? 's' : ''}`
                : 'Judicial Directory'}
            </h3>
            {totalResults > 0 && (
              <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                {showRetired ? 'All' : 'Active'}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className="badge badge-info pulse-glow">Querying Directory…</span>
            </div>
          ) : filteredJudges.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '2rem 0' }}>
              <User size={36} />
              <span style={{ fontSize: '0.88rem', textAlign: 'center' }}>
                {judges.length > 0 ? 'No active judges match filters.' : 'Enter judge name to look up records.'}
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {filteredJudges.map(j => {
                  const bg = avatarColor(j.id);
                  const isSelected = selectedJudge?.id === j.id;
                  return (
                    <div
                      key={j.id}
                      onClick={() => handleSelect(j)}
                      style={{
                        padding: '0.75rem',
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: `${bg}22`, border: `2px solid ${bg}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, color: bg, flexShrink: 0,
                      }}>
                        {initials(j.canonical_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {j.canonical_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {j.designation || (j.courts[0]?.court_name ?? '')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                        <span className={`badge ${j.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>
                          {j.is_active ? 'Active' : 'Retired'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {j.total_judgments.toLocaleString()} ₋jmts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} totalPages={totalPages} totalResults={totalResults} onPageChange={p => fetchPage(p)} />
            </>
          )}
        </div>

        {/* Right detail */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {selectedJudge ? (
            <>
              {/* ── Hero header ── */}
              <div style={{
                display: 'flex', gap: '1.1rem', alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.1rem',
                flexWrap: 'wrap',
              }}>
                {/* Large avatar */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                  background: `${avatarColor(selectedJudge.id)}22`,
                  border: `2.5px solid ${avatarColor(selectedJudge.id)}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', fontWeight: 800, color: avatarColor(selectedJudge.id),
                }}>
                  {initials(selectedJudge.canonical_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.2 }}>
                    {selectedJudge.canonical_name}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedJudge.designation}
                  </div>
                  {/* Name variants */}
                  {selectedJudge.name_variants.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {selectedJudge.name_variants.slice(0, 4).map(v => (
                        <span key={v} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Tenure quick summary */}
                  {selectedJudge.tenure_start && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Clock size={12} />
                      <span>Since {selectedJudge.tenure_start}</span>
                      {selectedJudge.tenure_end && <span>— {selectedJudge.tenure_end}</span>}
                    </div>
                  )}
                </div>
                <span className={`badge ${selectedJudge.is_active ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                  {selectedJudge.is_active ? 'Active Bench' : 'Retired'}
                </span>
              </div>

              {/* ── Numeric stats ── */}
              <div className="grid-cols-3">
                {[
                  { label: 'Total Judgments', value: selectedJudge.total_judgments, color: 'var(--accent-primary)', icon: <Scale size={16} /> },
                  { label: 'Authored',         value: selectedJudge.authored,         color: 'var(--accent-secondary)', icon: <BookOpen size={16} /> },
                  { label: 'Presided',         value: selectedJudge.presided,         color: 'var(--info)', icon: <Star size={16} /> },
                ].map(s => (
                  <div key={s.label} className="glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem', color: s.color, opacity: 0.7 }}>{s.icon}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, marginTop: '0.1rem' }}>
                      {s.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Judicial Tenure Timeline ── */}
              <div className="glass-card">
                <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={13} /> Court Tenure Timeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {(Array.isArray(selectedJudge.courts) ? selectedJudge.courts : []).map((court, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-glass)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ChevronRight size={13} color="var(--accent-primary)" />
                        <span style={{ fontWeight: 600 }}>{court.court_name}</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', flexShrink: 0 }}>
                        {court.start_date} — {court.end_date || 'Present'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Disposal Breakdown ── */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BarChart2 size={13} /> Disposal Verdict Breakdown
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {Object.entries(selectedJudge.disposal_breakdown ?? {}).map(([nature, count]) => {
                    const total = Object.values(selectedJudge.disposal_breakdown ?? {}).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const barColor = nature.toLowerCase().includes('dismiss') ? 'var(--danger)'
                      : nature.toLowerCase().includes('partly') ? 'var(--warning)'
                      : 'var(--accent-primary)';
                    return (
                      <div key={nature} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.82rem' }}>
                          <span>{nature}</span>
                          <strong style={{ fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: '0.5rem', color: barColor }}>
                            {count.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
                          </strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Case Type Breakdown — clickable filter chips ── */}
              {Object.keys(selectedJudge.case_type_breakdown ?? {}).length > 0 && (
                <div className="glass-card">
                  <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                    Case Type Distribution
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {Object.entries(selectedJudge.case_type_breakdown ?? {})
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <Chip
                          key={type}
                          label={type}
                          count={count}
                          active={activeCaseType === type}
                          onClick={() => setActiveCaseType(activeCaseType === type ? null : type)}
                        />
                      ))}
                  </div>
                  {activeCaseType && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Filtering judgments by "{activeCaseType}" — <button type="button" onClick={() => setActiveCaseType(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}>clear</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Authored Judgments ── */}
              <div>
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Authored Opinions</h4>
                  {judgments.length > 0 && (
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {visibleJudgments.length} of {judgments.length}
                    </span>
                  )}
                </div>
                {judgments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem', padding: '1.5rem 0' }}>
                    No authored judgments found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {visibleJudgments.slice(0, 10).map(j => (
                      <div
                        key={j.cnr}
                        onClick={onOpenCase ? () => {
                          // Build a minimal CaseInfo from the judgment to open the modal
                          onOpenCase({
                            cnr: j.cnr,
                            case_number: j.citation || j.neutral_citation || j.cnr,
                            case_type: j.case_type || '',
                            petitioner: j.petitioner || '',
                            respondent: j.respondent || '',
                            advocate_petitioner: '',
                            advocate_respondent: '',
                            judges: j.judge || (selectedJudge ? [selectedJudge.canonical_name] : []),
                            status: j.disposal_nature ? 'DISPOSED' : 'PENDING',
                            next_hearing_date: null,
                            court: j.court || { id: '', name: '', court_type: 'HIGH', state_code: '', parent_id: null, portal_url: '' },
                            orders: [],
                          });
                        } : undefined}
                        style={{
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: onOpenCase ? 'pointer' : 'default',
                          transition: 'var(--transition-fast)',
                        }}
                        onMouseEnter={e => { if (onOpenCase) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                        onMouseLeave={e => { if (onOpenCase) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-glass)'; }}
                      >
                        <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {j.citation || j.neutral_citation || j.cnr}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {typeof j.decision_date === 'string' ? j.decision_date : String(j.decision_date)}
                            </span>
                            {onOpenCase && <ExternalLink size={11} color="var(--text-muted)" />}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3 }}>{j.title}</div>
                        {j.disposal_nature && (
                          <div style={{ marginTop: '0.3rem' }}>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                              {j.disposal_nature}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '3rem 0' }}>
              <User size={44} />
              <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>Select a judge to view profile and analytics.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
