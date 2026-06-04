import React, { useState, useEffect } from 'react';
import { ShieldCheck, Merge, XCircle, Cpu, Database, AlertCircle, Play, RefreshCw } from 'lucide-react';
import type { ResolutionReviewItem, SeedStatus } from '../services/api';
import { apiService } from '../services/api';

interface AdminPanelProps {
  mockUpdateKey: number;
  onRefreshData: () => void;
}

// Map button key → backend job name(s) that indicate it is running
const JOB_NAME_MAP: Record<string, string[]> = {
  judges:    ['seed_judges',                   'seed_s3_judges'],
  advocates: ['seed_advocates',                'seed_s3_advocates'],
  'sweep-dc': ['sweep_cause_lists_district'],
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ mockUpdateKey, onRefreshData }) => {
  const [reviews, setReviews] = useState<ResolutionReviewItem[]>([]);
  const [seeds, setSeeds] = useState<SeedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerState, setTriggerState] = useState<Record<string, 'idle' | 'loading' | 'ok' | 'error'>>({});
  const [captchaStats] = useState({
    solver: 'ONNX Primary Model',
    fallbackSolver: 'ddddocr OCR Model',
    avgLatency: '142ms',
    solvedToday: 1240,
    failedToday: 18,
  });

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiService.getResolutionReview(), apiService.getSeedStatus()])
      .then(([revs, sds]) => {
        if (cancelled) return;
        setReviews(revs);
        setSeeds(sds);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [mockUpdateKey]);

  // Auto-refresh seed status every 10 s so running/completed state stays current
  useEffect(() => {
    const id = setInterval(() => {
      apiService.getSeedStatus().then(setSeeds).catch(console.error);
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  // Returns true when the seeds list shows this job as 'running'
  const isJobRunning = (key: string): boolean => {
    const names = JOB_NAME_MAP[key] ?? [];
    return seeds.some(s => names.includes(s.job) && s.status === 'running');
  };

  const handleMerge = async (id: string) => {
    try {
      const success = await apiService.mergeResolution(id);
      if (success) { setReviews(prev => prev.filter(r => r.id !== id)); onRefreshData(); }
    } catch (err) { console.error(err); }
  };

  const handleReject = async (id: string) => {
    try {
      const success = await apiService.rejectResolution(id);
      if (success) { setReviews(prev => prev.filter(r => r.id !== id)); onRefreshData(); }
    } catch (err) { console.error(err); }
  };

  const handleTrigger = async (key: string, fn: () => Promise<{ queued: boolean; error?: string }>) => {
    setTriggerState(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fn();
      setTriggerState(prev => ({ ...prev, [key]: res.queued ? 'ok' : 'error' }));
      if (res.queued) {
        // Refresh seed status after a brief pause so the UI picks up the new job
        setTimeout(() => {
          apiService.getSeedStatus().then(setSeeds).catch(console.error);
          setTriggerState(prev => ({ ...prev, [key]: 'idle' }));
        }, 3000);
      }
    } catch {
      setTriggerState(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const solveAccuracy = ((captchaStats.solvedToday / (captchaStats.solvedToday + captchaStats.failedToday)) * 100).toFixed(2);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* CAPTCHA Solver Status */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={17} color="var(--accent-primary)" /> CAPTCHA Solver Subsystem
        </h3>
        <div className="grid-cols-4">
          {[
            { label: 'Primary Classifier', value: captchaStats.solver, color: 'var(--text-primary)', large: false },
            { label: 'OCR Fallback Mode', value: captchaStats.fallbackSolver, color: 'var(--text-primary)', large: false },
            { label: 'Inference Latency', value: captchaStats.avgLatency, color: 'var(--info)', large: true },
            { label: 'Solve Accuracy', value: `${solveAccuracy}%`, color: 'var(--success)', large: true },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{s.label}</div>
              <div style={{ fontSize: s.large ? '1.25rem' : '0.95rem', fontWeight: s.large ? 800 : 700, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scraper Job Controls — always visible, full width */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Play size={17} color="var(--accent-primary)" /> Scraper Job Controls
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { key: 'judges',    label: 'Seed HC/SCI Judges',    sub: 'From S3 archive parquet',    fn: () => apiService.triggerSeedJudges() },
            { key: 'advocates', label: 'Seed HC Advocates',      sub: 'Parse raw_html from S3',     fn: () => apiService.triggerSeedAdvocates() },
            { key: 'sweep-dc',  label: 'Sweep DC Cause Lists',   sub: 'Live portal scrape',         fn: () => apiService.triggerSweepDC() },
          ].map(({ key, label, sub, fn }) => {
            const tState  = triggerState[key] ?? 'idle';
            const running = isJobRunning(key);
            const busy    = tState === 'loading' || running;

            let bg      = 'rgba(99,102,241,0.12)';
            let border  = '1px solid rgba(99,102,241,0.25)';
            let badgeEl = null;

            if (running) {
              bg = 'rgba(6,182,212,0.08)';
              border = '1px solid rgba(6,182,212,0.3)';
              badgeEl = <span className="badge badge-info pulse-glow" style={{ fontSize: '0.68rem' }}>running</span>;
            } else if (tState === 'ok') {
              bg = 'rgba(16,185,129,0.08)';
              border = '1px solid rgba(16,185,129,0.3)';
              badgeEl = <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>queued ✓</span>;
            } else if (tState === 'error') {
              bg = 'rgba(239,68,68,0.08)';
              border = '1px solid rgba(239,68,68,0.3)';
              badgeEl = <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }}>failed</span>;
            }

            return (
              <div key={key} style={{ background: bg, border, borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
                  </div>
                  {badgeEl}
                </div>
                <button
                  disabled={busy}
                  onClick={() => handleTrigger(key, fn)}
                  className="glass-button"
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.78rem',
                    height: 'auto',
                    gap: '0.4rem',
                    opacity: busy ? 0.55 : 1,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {tState === 'loading'
                    ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : running
                      ? <RefreshCw size={12} style={{ animation: 'spin 2s linear infinite' }} />
                      : <Play size={12} />}
                  {running ? 'Already running…' : tState === 'loading' ? 'Queuing…' : 'Run Now'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main split */}
      <div className="split-grid-wide-narrow">

        {/* Entity Resolution Board */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Merge size={17} color="var(--accent-secondary)" /> Entity Resolution Board
            </h3>
            <span className="badge badge-info">{reviews.length} pending</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px' }}>
              <span className="badge badge-info pulse-glow">Loading Resolver Pairs…</span>
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '180px', color: 'var(--text-muted)', gap: '0.5rem' }}>
              <ShieldCheck size={38} color="var(--success)" />
              <span style={{ fontSize: '0.88rem' }}>Entity Resolution registry is fully resolved.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {reviews.map(r => (
                <div key={r.id} style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                }}>
                  <div className="flex-between" style={{ marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{r.entity_type} RESOLVER</span>
                    <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--accent-secondary)', flexShrink: 0 }}>
                      Match: {r.similarity_score}%
                    </span>
                  </div>

                  {/* Name A / Name B comparison */}
                  <div className="two-col-detail" style={{ gap: '0.875rem', marginBottom: '0.875rem' }}>
                    {[
                      { label: 'Name A', name: r.name_a, court: r.details.court_a, cases: r.details.cases_a },
                      { label: 'Name B', name: r.name_b, court: r.details.court_b, cases: r.details.cases_b },
                    ].map(side => (
                      <div key={side.label} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{side.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{side.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {side.court} ({side.cases} cases)
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => handleMerge(r.id)} className="glass-button"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', height: 'auto', background: 'var(--success)' }}>
                      <Merge size={12} /> Merge
                    </button>
                    <button onClick={() => handleReject(r.id)} className="glass-button-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', height: 'auto', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <XCircle size={12} color="var(--danger)" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Crawl Seeds */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={17} color="var(--info)" /> Active Crawl Seeds
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {seeds.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No seed runs recorded yet. Trigger a job above.
              </div>
            ) : seeds.map((s, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem',
              }}>
                <div className="flex-between" style={{ marginBottom: '0.25rem', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.job}
                  </span>
                  <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'running' ? 'badge-info pulse-glow' : 'badge-warning'}`} style={{ flexShrink: 0 }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Ingested: <strong>{s.records_added.toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Info note */}
          <div style={{
            background: 'rgba(245,158,11,0.05)',
            border: '1px dashed rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
          }}>
            <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Entity deduplication resolves alternate spellings, variant abbreviations, and typographical errors.
              Nightly resolution sweeps run at 11:30 PM IST.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
