/**
 * CaseDetailModal
 *
 * Full-screen overlay showing rich case detail.
 * Opened from Judge/Advocate profile case cards, Cause Lists, etc.
 * Advocate and Judge names are clickable chips that trigger cross-tab navigation.
 */
import React from 'react';
import {
  X, Scale, Calendar, Eye, FileText, User, Award,
  ChevronRight, MapPin, ExternalLink, Clock,
} from 'lucide-react';
import type { CaseInfo } from '../services/api';

interface CaseDetailModalProps {
  caseInfo: CaseInfo;
  onClose: () => void;
  /** Called when user clicks an advocate name — navigate to Advocates tab pre-searching */
  onOpenAdvocate?: (name: string) => void;
  /** Called when user clicks a judge name — navigate to Judges tab pre-searching */
  onOpenJudge?: (name: string) => void;
}

// Small clickable entity chip
const EntityChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.3rem 0.7rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      cursor: onClick ? 'pointer' : 'default',
      border: `1px solid ${color}55`,
      background: `${color}18`,
      color,
      transition: 'all 0.15s ease',
      textAlign: 'left',
    }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = `${color}30`; }}
    onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = `${color}18`; }}
  >
    {icon}
    {label}
    {onClick && <ExternalLink size={10} style={{ opacity: 0.6 }} />}
  </button>
);

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseInfo: c,
  onClose,
  onOpenAdvocate,
  onOpenJudge,
}) => {
  // Build advocate list — both pet and resp
  const advocates: { name: string; role: string }[] = [];
  if (c.advocate_petitioner) advocates.push({ name: c.advocate_petitioner, role: 'Petitioner' });
  if (c.advocate_respondent) advocates.push({ name: c.advocate_respondent, role: 'Respondent' });

  const handleViewPdf = (url: string | null | undefined, _label?: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '2rem 1rem',
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '860px',
          padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
          margin: 'auto',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <MapPin size={11} />
              <span>{c.court?.name ?? 'Court'}</span>
              <ChevronRight size={11} />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{c.cnr}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '0.5rem' }}>
              {c.petitioner} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs.</span> {c.respondent}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${c.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                {c.status}
              </span>
              {c.case_type && (
                <span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '4px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>
                  {c.case_type}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Case Meta grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}>
          {[
            { label: 'Case Number', value: c.case_number },
            { label: 'CNR', value: c.cnr, mono: true },
            { label: 'Registration', value: c.registration_date ?? '—' },
            { label: 'Next Hearing', value: c.next_hearing_date ?? '—', highlight: !!c.next_hearing_date },
          ].map(f => (
            <div key={f.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.label}</div>
              <div style={{
                fontSize: '0.88rem', fontWeight: 700,
                fontFamily: f.mono ? 'var(--font-mono)' : undefined,
                color: f.highlight ? 'var(--warning)' : 'var(--text-primary)',
              }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* ── Parties & Advocates ── */}
        <div>
          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scale size={14} /> Parties &amp; Advocates
          </h4>

          {/* Structured parties view — shown when backend returns parties[] */}
          {c.parties && c.parties.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['petitioner', 'respondent', 'intervenor'] as const).map(ptype => {
                const group = c.parties!.filter(p => p.party_type === ptype);
                if (!group.length) return null;
                const color = ptype === 'petitioner' ? 'var(--accent-primary)' : ptype === 'respondent' ? 'var(--info)' : 'var(--accent-secondary)';
                const bg    = ptype === 'petitioner' ? 'rgba(99,102,241,0.05)' : ptype === 'respondent' ? 'rgba(6,182,212,0.05)' : 'rgba(139,92,246,0.05)';
                const bdr   = ptype === 'petitioner' ? 'rgba(99,102,241,0.15)' : ptype === 'respondent' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)';
                // Find the advocate for this side (fallback to raw string)
                const advocateName = ptype === 'petitioner' ? c.advocate_petitioner : ptype === 'respondent' ? c.advocate_respondent : null;
                return (
                  <div key={ptype} style={{ padding: '0.875rem 1rem', background: bg, border: `1px solid ${bdr}`, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.68rem', color, textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{ptype}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: advocateName ? '0.5rem' : 0 }}>
                      {group.map((p, i) => (
                        <span key={i} style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                          {p.name}{i < group.length - 1 ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> &amp; </span> : ''}
                        </span>
                      ))}
                    </div>
                    {advocateName && (
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Advocate</div>
                        <EntityChip
                          icon={<Award size={11} />}
                          label={advocateName}
                          color={color}
                          onClick={onOpenAdvocate ? () => onOpenAdvocate(advocateName) : undefined}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback: raw petitioner/respondent strings (case fetched before persistence) */
            <div className="two-col-detail">
              <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Petitioner</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>{c.petitioner}</div>
                {c.advocate_petitioner && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Advocate</div>
                    <EntityChip icon={<Award size={11} />} label={c.advocate_petitioner} color="var(--accent-secondary)"
                      onClick={onOpenAdvocate ? () => onOpenAdvocate(c.advocate_petitioner) : undefined} />
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--info)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Respondent</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>{c.respondent}</div>
                {c.advocate_respondent && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Advocate</div>
                    <EntityChip icon={<Award size={11} />} label={c.advocate_respondent} color="var(--info)"
                      onClick={onOpenAdvocate ? () => onOpenAdvocate(c.advocate_respondent) : undefined} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Court & Bench ── */}
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={12} /> Court &amp; Bench
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>{c.court?.name ?? '—'}</div>
          {c.judges && c.judges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {c.judges.map(j => (
                <EntityChip
                  key={j}
                  icon={<User size={11} />}
                  label={j}
                  color="var(--accent-primary)"
                  onClick={onOpenJudge ? () => onOpenJudge(j) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Hearing History ── (shown only when hearings[] is present) */}
        {c.hearings && c.hearings.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={14} /> Hearing History
            </h4>
            <div className="timeline">
              {c.hearings.map((h, idx) => {
                const isFuture = h.next_date === null && idx === c.hearings!.length - 1 && !c.orders?.some(o => o.order_date >= h.hearing_date);
                return (
                  <div key={idx} className="timeline-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{h.purpose ?? 'Hearing'}</div>
                        {h.judge && (
                          <div style={{ marginTop: '0.3rem' }}>
                            <EntityChip icon={<User size={10} />} label={h.judge} color="var(--accent-primary)"
                              onClick={onOpenJudge ? () => onOpenJudge(h.judge!) : undefined} />
                          </div>
                        )}
                        {h.next_date && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Next: <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{h.next_date}</span>
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        color: isFuture ? 'var(--warning)' : 'var(--text-secondary)',
                      }}>
                        {h.hearing_date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Case History / Orders Timeline ── */}
        <div>
          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Case History with Orders
          </h4>

          {/* Next hearing — prominent */}
          {c.next_hearing_date && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(99,102,241,0.06)',
              border: '1px dashed rgba(99,102,241,0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap', gap: '0.5rem',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>NEXT HEARING DATE</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pending — Final Status</div>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                {c.next_hearing_date}
              </span>
            </div>
          )}

          {/* Timeline of orders */}
          {c.orders && c.orders.length > 0 ? (
            <div className="timeline">
              {c.orders.map((o, idx) => (
                <div key={idx} className="timeline-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.order_type}</div>
                      {o.judge && (
                        <div style={{ marginTop: '0.3rem' }}>
                          <EntityChip
                            icon={<User size={10} />}
                            label={o.judge}
                            color="var(--accent-primary)"
                            onClick={onOpenJudge ? () => onOpenJudge(o.judge) : undefined}
                          />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {o.order_date}
                      </span>
                      {o.pdf_url && (
                        <button
                          className="glass-button-secondary"
                          style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', height: 'auto' }}
                          onClick={() => handleViewPdf(o.pdf_url, o.order_date)}
                        >
                          <Eye size={11} /> View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem', padding: '1.5rem 0', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
              No order history available for this case.
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', flexWrap: 'wrap' }}>
          {advocates.map(adv => (
            <button
              key={adv.name}
              className="glass-button-secondary"
              style={{ fontSize: '0.78rem', height: '36px' }}
              onClick={() => onOpenAdvocate?.(adv.name)}
            >
              <Award size={13} /> {adv.role} Advocate Profile
            </button>
          ))}
          <button className="glass-button-secondary" style={{ fontSize: '0.78rem', height: '36px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
