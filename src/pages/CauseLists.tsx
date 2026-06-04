import React, { useState, useEffect } from 'react';
import { Calendar, Search, FileText, Download, Layers } from 'lucide-react';
import type { Court, CauseListResponse } from '../services/api';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Notification } from '../components/Notification';

import type { CaseInfo } from '../services/api';

interface CauseListsProps {
  mockUpdateKey: number;
  onOpenCase?: (c: CaseInfo) => void;
}

export const CauseLists: React.FC<CauseListsProps> = ({ mockUpdateKey, onOpenCase: _onOpenCase }) => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('delhi-hc');
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-03');
  const [result, setResult] = useState<CauseListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { message, showToast } = useToast();

  useEffect(() => {
    apiService.getCourts()
      .then(res => {
        setCourts(res);
        if (res.length > 0) setSelectedCourt(res[1]?.id || res[0]?.id);
      })
      .catch(console.error);
  }, [mockUpdateKey]);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiService.getCauseList(selectedCourt, selectedDate);
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (result?.pdf_url && result.pdf_url !== '') {
      window.open(result.pdf_url, '_blank', 'noopener,noreferrer');
    } else {
      showToast('PDF cause list not yet available for this date.');
    }
  };

  const currentCourt = courts.find(c => c.id === selectedCourt);
  const isHighCourtOrSupreme = currentCourt?.court_type === 'HIGH' || currentCourt?.court_type === 'SUPREME';

  // Determine which panel to show after a fetch
  const showPdfPanel     = result !== null && isHighCourtOrSupreme;
  const showTable        = result !== null && !isHighCourtOrSupreme && result.entries.length > 0;
  const showNoEntries    = result !== null && !isHighCourtOrSupreme && result.entries.length === 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Filters */}
      <form onSubmit={handleQuery} className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="search-grid-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Court Forum</label>
            <select className="glass-input" value={selectedCourt}
              onChange={e => setSelectedCourt(e.target.value)}
              style={{ height: '42px' }}>
              {courts.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.court_type})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date of Listing</label>
            <input type="date" className="glass-input" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ height: '42px' }} />
          </div>

          <button type="submit" className="glass-button" style={{ height: '42px', alignSelf: 'flex-end' }}>
            <Search size={15} /> Fetch Listings
          </button>
        </div>
      </form>

      {/* Results panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.25rem',
          gap: '0.75rem', flexWrap: 'wrap',
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Daily Cause List</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {currentCourt?.name} &nbsp;|&nbsp; {selectedDate}
              {result?.bench_name && ` — ${result.bench_name}`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {result?.total_cases != null && (
              <span className="badge badge-info">{result.total_cases} cases</span>
            )}
            <span className={`badge ${
              currentCourt?.court_type === 'SUPREME' ? 'badge-danger' :
              currentCourt?.court_type === 'HIGH'    ? 'badge-success' : 'badge-info'
            }`}>
              {currentCourt?.court_type}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px' }}>
            <span className="badge badge-info pulse-glow">Retrieving Cause List…</span>
          </div>
        )}

        {/* Initial state — no fetch yet */}
        {!loading && result === null && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '180px', color: 'var(--text-muted)', gap: '0.5rem' }}>
            <Calendar size={36} />
            <span style={{ fontSize: '0.88rem', textAlign: 'center' }}>Select parameters above to retrieve listings.</span>
          </div>
        )}

        {/* HC / SCI — PDF download view */}
        {!loading && showPdfPanel && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)', padding: '2rem',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          }}>
            <FileText size={48} color="var(--accent-primary)" />
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                High Court / Supreme Court PDF Cause List
              </h4>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
                High Court and Supreme Court cause lists are published as monolithic document files.
                {result?.pdf_url
                  ? ' The cached PDF is ready for download.'
                  : ' The PDF is not yet available for this date — check back later or visit the court portal directly.'}
              </p>
            </div>
            <button className="glass-button" onClick={handleDownloadPdf}>
              <Download size={14} /> Download PDF Cause List
            </button>
          </div>
        )}

        {/* District court — no entries yet */}
        {!loading && showNoEntries && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '180px', color: 'var(--text-muted)', gap: '0.5rem' }}>
            <Calendar size={36} />
            <span style={{ fontSize: '0.88rem', textAlign: 'center' }}>
              No listings found for this date. District court structured cause lists are implemented in Phase 3.
            </span>
          </div>
        )}

        {/* District court — structured table */}
        {!loading && showTable && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="custom-table" style={{ minWidth: '640px' }}>
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>S.No</th>
                  <th>Case Number</th>
                  <th>Petitioner vs Respondent</th>
                  <th>Counsels (P / R)</th>
                  <th>Bench &amp; Judge</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((entry, index) => (
                  <tr key={index} className="table-row">
                    <td><span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{entry.serial_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.88rem' }}>{entry.case_number}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{entry.case_type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{entry.petitioner}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs.</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{entry.respondent}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.83rem' }}>P: {entry.advocate_petitioner || 'N/A'}</div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>R: {entry.advocate_respondent || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{entry.judge}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Layers size={11} /> {entry.bench}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Notification message={message} />
    </div>
  );
};
