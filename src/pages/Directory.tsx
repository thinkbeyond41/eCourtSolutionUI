import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Network, Layers } from 'lucide-react';
import type { Court } from '../services/api';
import { apiService } from '../services/api';

interface DirectoryProps {
  mockUpdateKey: number;
}

export const Directory: React.FC<DirectoryProps> = ({ mockUpdateKey }) => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [states, setStates] = useState<{ code: string; name: string }[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [districts, setDistricts] = useState<{ code: string; name: string }[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [complexes, setComplexes] = useState<{ code: string; name: string }[]>([]);
  const [selectedComplex, setSelectedComplex] = useState('');

  useEffect(() => {
    apiService.getCourts().then(setCourts).catch(console.error);
    apiService.getStates().then(setStates).catch(console.error);
  }, [mockUpdateKey]);

  const handleStateChange = async (stateCode: string) => {
    setSelectedState(stateCode);
    setSelectedDistrict('');
    setComplexes([]);
    setSelectedComplex('');
    if (!stateCode) { setDistricts([]); return; }
    try {
      const res = await apiService.getDistricts(stateCode);
      setDistricts(res);
    } catch (err) { console.error(err); }
  };

  const handleDistrictChange = async (districtCode: string) => {
    setSelectedDistrict(districtCode);
    setSelectedComplex('');
    if (!districtCode) { setComplexes([]); return; }
    try {
      const res = await apiService.getComplexes(selectedState, districtCode);
      setComplexes(res);
    } catch (err) { console.error(err); }
  };

  const courtTypeColor = (type: string) => {
    if (type === 'SUPREME') return { bg: 'rgba(239,68,68,0.1)', fg: 'var(--danger)', badge: 'badge-danger' };
    if (type === 'HIGH')    return { bg: 'rgba(16,185,129,0.1)', fg: 'var(--success)', badge: 'badge-success' };
    return { bg: 'rgba(99,102,241,0.1)', fg: 'var(--accent-primary)', badge: 'badge-info' };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="split-grid-narrow-wide">

        {/* Primary Court Directory */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={17} color="var(--accent-primary)" /> Primary Court Directory
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {courts.map(court => {
              const { bg, fg, badge } = courtTypeColor(court.court_type);
              return (
                <div key={court.id} className="glass-card" style={{
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                    <div style={{ background: bg, padding: '0.55rem', borderRadius: 'var(--radius-sm)', color: fg, flexShrink: 0 }}>
                      <Building2 size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {court.name}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {court.portal_url}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${badge}`} style={{ flexShrink: 0 }}>{court.court_type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hierarchy Finder */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={17} color="var(--accent-secondary)" /> District Complex Hierarchy
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>1. Select State Jurisdiction</label>
              <select className="glass-input" value={selectedState}
                onChange={e => handleStateChange(e.target.value)}
                style={{ height: '42px' }}>
                <option value="">— Choose State —</option>
                {states.map(s => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>2. Select Judicial District</label>
              <select className="glass-input" value={selectedDistrict}
                onChange={e => handleDistrictChange(e.target.value)}
                disabled={!selectedState}
                style={{ height: '42px', opacity: !selectedState ? 0.5 : 1 }}>
                <option value="">— Choose District —</option>
                {districts.map(d => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>3. Court Complex Endpoint</label>
              <select className="glass-input" value={selectedComplex}
                onChange={e => setSelectedComplex(e.target.value)}
                disabled={!selectedDistrict}
                style={{ height: '42px', opacity: !selectedDistrict ? 0.5 : 1 }}>
                <option value="">— Choose Complex —</option>
                {complexes.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Resolved result */}
            {selectedComplex && (
              <div className="glass-card animate-fade-in" style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px dashed rgba(99,102,241,0.3)',
                padding: '1.1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
              }}>
                <MapPin size={22} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
                    Target Complex Mapped
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-all' }}>
                    DB reference: <code>{`dc-${selectedState.toLowerCase()}-${selectedDistrict.toLowerCase()}-${selectedComplex}`}</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
