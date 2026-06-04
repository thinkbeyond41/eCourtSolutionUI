import React, { useState, useEffect } from 'react';
import { DownloadCloud, Play, AlertTriangle } from 'lucide-react';
import type { BulkJob, Court } from '../services/api';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Notification } from '../components/Notification';

interface BulkJobsProps {
  mockUpdateKey: number;
}

export const BulkJobs: React.FC<BulkJobsProps> = ({ mockUpdateKey }) => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { message, showToast } = useToast();

  useEffect(() => {
    apiService.getCourts()
      .then(res => {
        setCourts(res);
        if (res.length > 0) setSelectedCourt(res[1]?.id || res[0]?.id);
      })
      .catch(console.error);

    apiService.getBulkJobs().then(setJobs).catch(console.error);
  }, [mockUpdateKey]);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourt) return;
    setSubmitting(true);
    try {
      const yearInt = selectedYear ? parseInt(selectedYear) : undefined;
      await apiService.startBulkJob(selectedCourt, yearInt);
      const updatedJobs = await apiService.getBulkJobs();
      setJobs(updatedJobs);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === 'COMPLETED') return 'badge-success';
    if (status === 'FAILED') return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Info banner */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        borderLeft: '4px solid var(--accent-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <AlertTriangle size={22} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.25rem' }}>Async Bulk Ingestion Queue</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Bulk downloads package all judgments matching criteria into a structured ZIP file containing Parquet metadata and PDF records.
            Jobs run on background ARQ workers and expire from storage after 7 days.
          </p>
        </div>
      </div>

      {/* Split: form + job list */}
      <div className="split-grid-narrow-wide">

        {/* Request form */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            Request Ingestion Pack
          </h3>

          <form onSubmit={handleSubmitJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Target Court</label>
              <select className="glass-input" value={selectedCourt}
                onChange={e => setSelectedCourt(e.target.value)}
                style={{ height: '42px' }}>
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Year (Optional)</label>
              <input type="number" className="glass-input" placeholder="All years"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)} />
            </div>

            <button type="submit" className="glass-button"
              style={{ justifyContent: 'center', marginTop: '0.5rem' }}
              disabled={submitting}>
              <Play size={15} /> {submitting ? 'Submitting…' : 'Queue Bulk Pack'}
            </button>
          </form>
        </div>

        {/* Job tracking */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', minHeight: '300px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            Active &amp; Historical Tasks ({jobs.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {jobs.map(job => {
              const courtName = courts.find(c => c.id === job.court_id)?.name || job.court_id;
              return (
                <div key={job.job_id} style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ID: {job.job_id}
                      </div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {courtName}
                      </h4>
                      {job.year && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Year: {job.year}</span>
                      )}
                    </div>
                    <span className={`badge ${statusBadgeClass(job.status)}`} style={{ flexShrink: 0 }}>{job.status}</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: '0.625rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Progress: {job.progress.toFixed(1)}%</span>
                      <span>{job.records_processed.toLocaleString()} / {job.records_total.toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${job.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {job.status === 'COMPLETED' && (
                    <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="glass-button-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', height: 'auto' }}
                        onClick={() => {
                          if (job.download_url && job.download_url !== '#') {
                            window.open(job.download_url, '_blank', 'noopener,noreferrer');
                          } else {
                            showToast(`ZIP download not available in mock mode — job ${job.job_id}`);
                          }
                        }}>
                        <DownloadCloud size={13} /> Download ZIP
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {jobs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', padding: '2rem 0' }}>
                No bulk jobs found. Queue a new ingestion pack.
              </div>
            )}
          </div>
        </div>
      </div>

      <Notification message={message} />
    </div>
  );
};
