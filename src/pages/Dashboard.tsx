import React, { useEffect, useState } from 'react';
import { 
  Scale, Users, CheckCircle2, Zap, FileText, Globe, Database
} from 'lucide-react';
import type { SeedStatus } from '../services/api';
import { apiService } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  mockUpdateKey: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, mockUpdateKey }) => {
  const [seeds, setSeeds] = useState<SeedStatus[]>([]);
  const [stats] = useState({
    totalCourts: 26,
    casesTracked: 184562,
    activeJudges: 342,
    captchaSuccessRate: 94.6,
  });

  useEffect(() => {
    apiService.getSeedStatus()
      .then(res => setSeeds(res))
      .catch(console.error);
  }, [mockUpdateKey]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Welcome Banner ── */}
      <div className="glass-panel" style={{
        padding: '2rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 className="banner-title" style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            eCourt Indian Legal Database Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '700px', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Real-time unified query engine for Supreme Court of India, 25 High Courts, and 700+ District court complexes.
            Search case records, read archive judgments, monitor cause lists, and analyse advocate / judge profiles.
          </p>
        </div>
        {/* Decorative icon — hidden on small screens via opacity trick */}
        <div style={{
          position: 'absolute',
          right: '4%',
          bottom: '-15%',
          opacity: 0.12,
          pointerEvents: 'none',
        }}>
          <Scale size={200} color="var(--accent-primary)" />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-cols-4">
        {[
          { icon: <Globe size={22} />, label: 'Tiers Indexed',       value: '3/3',                                   color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.1)' },
          { icon: <FileText size={22} />, label: 'Indexed Judgments', value: stats.casesTracked.toLocaleString(),    color: 'var(--accent-secondary)', bg: 'rgba(168, 85, 247, 0.1)' },
          { icon: <Users size={22} />, label: 'Judges Directory',    value: stats.activeJudges.toString(),           color: 'var(--info)',            bg: 'rgba(6, 182, 212, 0.1)' },
          { icon: <CheckCircle2 size={22} />, label: 'CAPTCHA Solve Rate', value: `${stats.captchaSuccessRate}%`,   color: 'var(--success)',         bg: 'rgba(16, 185, 129, 0.1)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
            <div style={{ background: s.bg, padding: '0.65rem', borderRadius: 'var(--radius-md)', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
              <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main operations split ── */}
      <div className="split-grid-wide-narrow">
        {/* Core Search Panels */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={17} color="var(--accent-primary)" /> Unified Query Gateway
          </h3>
          <div className="grid-cols-2">
            {[
              { tab: 'cases',      title: 'Case Records',       desc: 'Look up real-time statuses using CNR, filing numbers, advocate credentials or party names.' },
              { tab: 'judgments',  title: 'Full-text Judgments', desc: 'Search over 17.8 million historical judgments from AWS Open Data and SCI main site.' },
              { tab: 'causelists', title: 'Cause Lists',         desc: 'Monitor court listings, bench layouts, and advocate appearance timings.' },
              { tab: 'courts',     title: 'Court Hierarchy',     desc: 'Traverse and map the structure of 36 States, their districts, and court complexes.' },
            ].map(({ tab, title, desc }) => (
              <div key={tab} className="glass-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate(tab)}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h4>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Archival Sync Seeds */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={17} color="var(--accent-secondary)" /> Archival Sync Seeds
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {seeds.map((s, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
              }}>
                <div className="flex-between" style={{ marginBottom: '0.5rem', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.job}
                  </span>
                  <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Ingested: <strong>{s.records_added.toLocaleString()}</strong>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${s.status === 'completed' ? 100 : (s.year_current / s.year_total) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div className="flex-between" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>1950</span>
                  <span>Year {s.year_current}</span>
                </div>
              </div>
            ))}
            {seeds.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>
                No seed jobs available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
