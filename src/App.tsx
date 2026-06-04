import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CaseDetailModal } from './components/CaseDetailModal';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { Judgments } from './pages/Judgments';
import { CauseLists } from './pages/CauseLists';
import { Directory } from './pages/Directory';
import { Advocates } from './pages/Advocates';
import { Judges } from './pages/Judges';
import { BulkJobs } from './pages/BulkJobs';
import { AdminPanel } from './pages/AdminPanel';
import type { CaseInfo } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mockUpdateKey, setMockUpdateKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cross-tab deep-link state
  // When set, CaseDetailModal overlays the current tab
  const [caseOverlay, setCaseOverlay] = useState<CaseInfo | null>(null);
  // When set, the target tab auto-runs a search for this query on next mount/change
  const [pendingAdvocateSearch, setPendingAdvocateSearch] = useState<string>('');
  const [pendingJudgeSearch, setPendingJudgeSearch] = useState<string>('');

  const handleMockToggle = () => setMockUpdateKey(prev => prev + 1);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  /** Open case detail modal from any page (judge profile, advocate profile, cause list…) */
  const handleOpenCase = (c: CaseInfo) => {
    setCaseOverlay(c);
  };

  /** From case detail modal: navigate to advocates tab and pre-search */
  const handleOpenAdvocateFromCase = (name: string) => {
    setCaseOverlay(null);
    setPendingAdvocateSearch(name);
    setActiveTab('advocates');
  };

  /** From case detail modal: navigate to judges tab and pre-search */
  const handleOpenJudgeFromCase = (name: string) => {
    setCaseOverlay(null);
    setPendingJudgeSearch(name);
    setActiveTab('judges');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':  return 'Operational Overview';
      case 'cases':      return 'Live Case Tracking';
      case 'judgments':  return 'Judgment Search';
      case 'causelists': return 'Daily Cause Lists';
      case 'courts':     return 'Court Registry';
      case 'advocates':  return 'Advocate Directory';
      case 'judges':     return 'Judicial Profiles';
      case 'bulk':       return 'Bulk Ingestions';
      case 'admin':      return 'System Administration';
      default:           return 'eCourtSolution';
    }
  };

  const renderActivePage = () => {
    const label = getPageTitle();
    const page = (() => {
      switch (activeTab) {
        case 'dashboard':  return <Dashboard onNavigate={handleTabChange} mockUpdateKey={mockUpdateKey} />;
        case 'cases':      return <Cases mockUpdateKey={mockUpdateKey} onOpenCase={handleOpenCase} />;
        case 'judgments':  return <Judgments mockUpdateKey={mockUpdateKey} />;
        case 'causelists': return <CauseLists mockUpdateKey={mockUpdateKey} onOpenCase={handleOpenCase} />;
        case 'courts':     return <Directory mockUpdateKey={mockUpdateKey} />;
        case 'advocates':
          return (
            <Advocates
              mockUpdateKey={mockUpdateKey}
              initialSearch={pendingAdvocateSearch}
              onInitialSearchConsumed={() => setPendingAdvocateSearch('')}
              onOpenCase={handleOpenCase}
            />
          );
        case 'judges':
          return (
            <Judges
              mockUpdateKey={mockUpdateKey}
              initialSearch={pendingJudgeSearch}
              onInitialSearchConsumed={() => setPendingJudgeSearch('')}
              onOpenCase={handleOpenCase}
            />
          );
        case 'bulk':       return <BulkJobs mockUpdateKey={mockUpdateKey} />;
        case 'admin':      return <AdminPanel mockUpdateKey={mockUpdateKey} onRefreshData={handleMockToggle} />;
        default:           return <Dashboard onNavigate={handleTabChange} mockUpdateKey={mockUpdateKey} />;
      }
    })();
    return <ErrorBoundary label={label}>{page}</ErrorBoundary>;
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
      <main className="main-content">
        <Header
          title={getPageTitle()}
          onMockToggle={handleMockToggle}
          onMenuOpen={() => setDrawerOpen(true)}
        />
        <div className="page-container">
          {renderActivePage()}
        </div>
      </main>

      {/* Case detail modal — floats above all tabs */}
      {caseOverlay && (
        <CaseDetailModal
          caseInfo={caseOverlay}
          onClose={() => setCaseOverlay(null)}
          onOpenAdvocate={handleOpenAdvocateFromCase}
          onOpenJudge={handleOpenJudgeFromCase}
        />
      )}
    </div>
  );
}

export default App;
