import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, ShieldCheck, BookOpen, X, Filter, MapPin, Building2, Briefcase, Clock, ChevronRight, Users, ExternalLink } from 'lucide-react';
import type { Advocate, CaseInfo, Court } from '../services/api';
import { apiService } from '../services/api';
import { Pagination } from '../components/Pagination';

interface AdvocatesProps {
  mockUpdateKey: number;
  initialSearch?: string;
  onInitialSearchConsumed?: () => void;
  onOpenCase?: (c: CaseInfo) => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4',
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Clickable filter chip (used in profile for Case Types, Courts, States)
const Chip: React.FC<{
  label: string;
  count?: number;
  active?: boolean;
  color?: string;
  onClick: () => void;
}> = ({ label, count, active, color = 'var(--accent-primary)', onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.28rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.77rem',
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      border: active ? `1px solid ${color}` : '1px solid var(--border-glass)',
      background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
      color: active ? color : 'var(--text-secondary)',
      transition: 'var(--transition-fast)',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    {count !== undefined && (
      <span style={{
        fontSize: '0.67rem',
        fontWeight: 600,
        background: active ? color : 'rgba(255,255,255,0.12)',
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

// State code → human name mapping (top states only; fallback to code)
const STATE_NAMES: Record<string, string> = {
  DL: 'Delhi', MH: 'Maharashtra', UP: 'Uttar Pradesh', KA: 'Karnataka',
  TN: 'Tamil Nadu', GJ: 'Gujarat', RJ: 'Rajasthan', PB: 'Punjab',
  WB: 'West Bengal', AP: 'Andhra Pradesh', TS: 'Telangana', KL: 'Kerala',
  HR: 'Haryana', MP: 'Madhya Pradesh', BR: 'Bihar', OR: 'Odisha',
  IN: 'Supreme Court',
};

export const Advocates: React.FC<AdvocatesProps> = ({
  initialSearch = '',
  onInitialSearchConsumed,
  onOpenCase,
}) => {
  const [searchName, setSearchName]       = useState('');
  const [stateFilter, setStateFilter]     = useState('');
  const [courtFilter, setCourtFilter]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [advocates, setAdvocates]         = useState<Advocate[]>([]);
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [cases, setCases]                 = useState<CaseInfo[]>([]);
  const [courts, setCourts]               = useState<Court[]>([]);
  const [page, setPage]                   = useState(1);
  const [totalResults, setTotalResults]   = useState(0);
  const [totalPages, setTotalPages]       = useState(1);
  const [showDetail, setShowDetail]       = useState(false);
  const [showFilters, setShowFilters]     = useState(false);

  // Profile-level active filters (click chips on profile)
  const [activeSpecialization, setActiveSpecialization] = useState<string | null>(null);
  const [activeCourt, setActiveCourt]     = useState<string | null>(null);
  const [activeState, setActiveState]     = useState<string | null>(null);
  const [caseStatusFilter, setCaseStatusFilter] = useState<'all' | 'PENDING' | 'DISPOSED'>('all');

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm]           = useState({ barReg: '', email: '', phone: '' });
  const [claimSuccess, setClaimSuccess]     = useState(false);

  useEffect(() => {
    apiService.getCourts().then(setCourts).catch(console.error);
  }, []);

  // Auto-run search when navigated here from a case detail (e.g. clicked advocate name)
  useEffect(() => {
    if (!initialSearch) return;
    setSearchName(initialSearch);
    onInitialSearchConsumed?.();
    setLoading(true);
    apiService.searchAdvocates({ name: initialSearch }, 1).then(result => {
      const items = (result.items ?? []).map((a: Advocate) => ({
        ...a,
        courts: Array.isArray(a.courts) ? a.courts : [],
        name_variants: Array.isArray(a.name_variants) ? a.name_variants : [],
        specializations: a.specializations && typeof a.specializations === 'object' ? a.specializations : {},
        states: a.states && typeof a.states === 'object' ? a.states : {},
      }));
      setAdvocates(items);
      setPage(result.page);
      setTotalResults(result.total);
      setTotalPages(result.total_pages);
      if (items.length > 0) handleSelect(items[0]);
    }).catch(console.error).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  const fetchPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await apiService.searchAdvocates(
        { name: searchName, state: stateFilter || undefined, court: courtFilter || undefined },
        targetPage,
      );
      setAdvocates(result.items);
      setPage(result.page);
      setTotalResults(result.total);
      setTotalPages(result.total_pages);
      if (result.items.length > 0) {
        await handleSelect(result.items[0]);
        setShowDetail(false);
      } else {
        setSelectedAdvocate(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, stateFilter, courtFilter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchPage(1);
  };

  const handleSelect = async (advocate: Advocate) => {
    setSelectedAdvocate(advocate);
    setClaimSuccess(false);
    setShowDetail(true);
    setActiveSpecialization(null);
    setActiveCourt(null);
    setActiveState(null);
    setCaseStatusFilter('all');
    try {
      const res = await apiService.getAdvocateCases(advocate.id);
      setCases(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvocate) return;
    try {
      const res = await apiService.claimAdvocateProfile(selectedAdvocate.id, {
        bar_registration_number: claimForm.barReg,
        phone: claimForm.phone,
        email: claimForm.email,
      });
      if (res.success) {
        setClaimSuccess(true);
        setTimeout(() => setShowClaimModal(false), 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered cases based on profile filters
  const visibleCases = cases.filter(c => {
    if (caseStatusFilter === 'PENDING' && c.status !== 'PENDING') return false;
    if (caseStatusFilter === 'DISPOSED' && c.status === 'PENDING') return false;
    if (activeCourt && c.court?.id !== activeCourt) return false;
    return true;
  });

  const courtOptions = courts.filter(ct => ct.court_type === 'SUPREME' || ct.court_type === 'HIGH');

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

      {/* Search + filter bar */}
      <form
        onSubmit={handleSearch}
        className={`glass-panel${showDetail ? ' mobile-panel-hidden' : ''}`}
        style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              type="text"
              className="glass-input"
              placeholder="Search advocates directory (e.g. Sandeep G. Mehta)"
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

        {showFilters && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem', borderTop: '1px solid var(--border-glass)' }}>
            {/* State filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>State</label>
              <select
                className="glass-input"
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                style={{ height: '38px', padding: '0 0.75rem' }}
              >
                <option value="">All States</option>
                {Object.entries(STATE_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            {/* Court filter */}
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
            {(stateFilter || courtFilter) && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="glass-button-secondary"
                  style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => { setStateFilter(''); setCourtFilter(''); }}
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.6rem' }}>
            {totalResults > 0
              ? `${totalResults.toLocaleString()} Advocate${totalResults !== 1 ? 's' : ''}`
              : 'Advocate Records'}
          </h3>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className="badge badge-info pulse-glow">Querying Profiles…</span>
            </div>
          ) : advocates.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '2rem 0' }}>
              <BookOpen size={36} />
              <span style={{ fontSize: '0.88rem', textAlign: 'center' }}>Search advocates to inspect profiles.</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {advocates.map(a => {
                  const bg = avatarColor(a.id);
                  const isSelected = selectedAdvocate?.id === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelect(a)}
                      style={{
                        padding: '0.75rem',
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        gap: '0.65rem',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: `${bg}22`, border: `2px solid ${bg}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 800, color: bg,
                      }}>
                        {initials(a.canonical_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.canonical_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {a.courts[0]?.court_name ?? 'Unknown court'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                          {a.total_cases.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>cases</span>
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
          {selectedAdvocate ? (
            <>
              {/* ── Hero header ── */}
              <div style={{
                display: 'flex', gap: '1.1rem', alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.1rem',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                  background: `${avatarColor(selectedAdvocate.id)}22`,
                  border: `2.5px solid ${avatarColor(selectedAdvocate.id)}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', fontWeight: 800, color: avatarColor(selectedAdvocate.id),
                }}>
                  {initials(selectedAdvocate.canonical_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.2 }}>
                    Advocate {selectedAdvocate.canonical_name}
                  </h3>
                  {/* Name variants */}
                  {selectedAdvocate.name_variants.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      {selectedAdvocate.name_variants.slice(0, 4).map(v => (
                        <span key={v} style={{ fontSize: '0.67rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* First/Last seen */}
                  <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <Clock size={11} />
                      <span>First seen: <strong>{selectedAdvocate.first_seen}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <Clock size={11} />
                      <span>Last seen: <strong>{selectedAdvocate.last_seen}</strong></span>
                    </div>
                  </div>
                </div>
                <button
                  className="glass-button"
                  style={{ flexShrink: 0, height: '36px', padding: '0 0.875rem', fontSize: '0.82rem' }}
                  onClick={() => setShowClaimModal(true)}
                >
                  <ShieldCheck size={14} /> Claim Profile
                </button>
              </div>

              {/* ── Stats ── */}
              <div className="grid-cols-3">
                {[
                  { label: 'Total Cases',   value: selectedAdvocate.total_cases,    color: 'var(--accent-primary)',   icon: <Briefcase size={15} /> },
                  { label: 'Pending',       value: selectedAdvocate.pending_cases,  color: 'var(--warning)',          icon: <Clock size={15} /> },
                  { label: 'Disposed',      value: selectedAdvocate.disposed_cases, color: 'var(--success)',          icon: <Award size={15} /> },
                ].map(s => (
                  <div key={s.label} className="glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.2rem', color: s.color, opacity: 0.7 }}>{s.icon}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, marginTop: '0.1rem' }}>
                      {s.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Filters section (eCourtsIndia-style) ── */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Filters
                </h4>

                {/* Case Types */}
                {Object.keys(selectedAdvocate.specializations).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Briefcase size={11} /> Case Types
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {Object.entries(selectedAdvocate.specializations)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <Chip
                            key={type}
                            label={type}
                            count={count}
                            active={activeSpecialization === type}
                            color="var(--accent-primary)"
                            onClick={() => setActiveSpecialization(activeSpecialization === type ? null : type)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Case Status */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Scale size={11} /> Case Status
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <Chip
                      label="Disposed"
                      count={selectedAdvocate.disposed_cases}
                      active={caseStatusFilter === 'DISPOSED'}
                      color="var(--success)"
                      onClick={() => setCaseStatusFilter(caseStatusFilter === 'DISPOSED' ? 'all' : 'DISPOSED')}
                    />
                    <Chip
                      label="Pending"
                      count={selectedAdvocate.pending_cases}
                      active={caseStatusFilter === 'PENDING'}
                      color="var(--warning)"
                      onClick={() => setCaseStatusFilter(caseStatusFilter === 'PENDING' ? 'all' : 'PENDING')}
                    />
                  </div>
                </div>

                {/* Courts */}
                {selectedAdvocate.courts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={11} /> Courts
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {selectedAdvocate.courts.map(c => (
                        <Chip
                          key={c.court_id}
                          label={c.court_name}
                          count={c.case_count}
                          active={activeCourt === c.court_id}
                          color="var(--info)"
                          onClick={() => setActiveCourt(activeCourt === c.court_id ? null : c.court_id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* States */}
                {Object.keys(selectedAdvocate.states).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={11} /> States
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {Object.entries(selectedAdvocate.states).map(([code, count]) => (
                        <Chip
                          key={code}
                          label={STATE_NAMES[code] ?? code}
                          count={count}
                          active={activeState === code}
                          color="#8b5cf6"
                          onClick={() => setActiveState(activeState === code ? null : code)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Forum presence (detailed) ── */}
              <div className="glass-card">
                <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={13} /> Forum Representation
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedAdvocate.courts.map((court, idx) => {
                    const pct = selectedAdvocate.total_cases > 0
                      ? (court.case_count / selectedAdvocate.total_cases) * 100 : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.85rem', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                            <ChevronRight size={12} color="var(--info)" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {court.court_name}
                            </span>
                          </div>
                          <span className="badge badge-info" style={{ flexShrink: 0, fontSize: '0.68rem' }}>
                            {court.case_count.toLocaleString()} cases
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--info)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Cases represented ── */}
              <div>
                <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    Cases Represented by {selectedAdvocate.canonical_name.split(' ')[0]}
                  </h4>
                  {cases.length > 0 && (
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {visibleCases.length} of {cases.length}
                    </span>
                  )}
                </div>

                {cases.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem', padding: '1.5rem 0' }}>
                    No case records found for this advocate.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {visibleCases.slice(0, 10).map(c => (
                      <div
                        key={c.cnr}
                        onClick={onOpenCase ? () => onOpenCase(c) : undefined}
                        style={{
                          padding: '0.875rem',
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: onOpenCase ? 'pointer' : 'default',
                          transition: 'var(--transition-fast)',
                        }}
                        onMouseEnter={e => { if (onOpenCase) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                        onMouseLeave={e => { if (onOpenCase) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-glass)'; }}
                      >
                        {/* Title row */}
                        <div className="flex-between" style={{ marginBottom: '0.45rem', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3, flex: 1 }}>
                            {c.petitioner} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.78rem' }}>vs.</span> {c.respondent}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <span className={`badge ${c.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                              {c.status}
                            </span>
                            {onOpenCase && <ExternalLink size={12} color="var(--text-muted)" />}
                          </div>
                        </div>
                        {/* Meta row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{c.case_number}</span>
                          {c.case_type && <span>{c.case_type}</span>}
                          {c.registration_date && <span>Filed: {c.registration_date}</span>}
                          {c.next_hearing_date && (
                            <span style={{ color: 'var(--warning)' }}>Next: {c.next_hearing_date}</span>
                          )}
                        </div>
                        {/* Advocates row */}
                        {(c.advocate_petitioner || c.advocate_respondent) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                            {c.advocate_petitioner && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Pet. Adv: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.advocate_petitioner}</span>
                              </span>
                            )}
                            {c.advocate_respondent && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Res. Adv: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.advocate_respondent}</span>
                              </span>
                            )}
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
              <Award size={44} />
              <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>Select an advocate to inspect their full profile.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Claim Profile Modal ── */}
      {showClaimModal && selectedAdvocate && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <form onSubmit={handleClaimSubmit} className="glass-panel"
            style={{ padding: '1.75rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Claim Advocate Profile</h3>
              <button type="button" onClick={() => setShowClaimModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Submit credentials to associate your login with: <strong>{selectedAdvocate.canonical_name}</strong>
            </p>
            {[
              { label: 'Bar Registration Number', type: 'text', key: 'barReg', placeholder: 'e.g. MAH/1024/2012' },
              { label: 'Professional Email', type: 'email', key: 'email', placeholder: 'you@barcouncil.org' },
              { label: 'Phone (for OTP)', type: 'tel', key: 'phone', placeholder: '+91 XXXXX XXXXX' },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                <input type={f.type} className="glass-input" placeholder={f.placeholder} required
                  value={claimForm[f.key as keyof typeof claimForm]}
                  onChange={e => setClaimForm({ ...claimForm, [f.key]: e.target.value })} />
              </div>
            ))}
            {claimSuccess ? (
              <div className="badge badge-success" style={{ justifyContent: 'center', padding: '0.6rem', textTransform: 'none', fontSize: '0.85rem' }}>
                ✓ Claim submitted for review!
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }}>Submit Claim</button>
                <button type="button" className="glass-button-secondary" onClick={() => setShowClaimModal(false)}>Cancel</button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

// Needed for Scale icon used inside JSX
function Scale(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 6l9 9 9-9M3 18h18"/>
    </svg>
  );
}
