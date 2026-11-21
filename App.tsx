import React from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { OverviewPage } from './pages/OverviewPage';
import { EvidenceGraphPage } from './pages/EvidenceGraphPage';
import { UploadPage } from './pages/UploadPage';
import { VerificationPage } from './pages/VerificationPage';
import { TransactionNetworkPage } from './pages/TransactionNetworkPage';
import { InvestigatorPage } from './pages/InvestigatorPage';
import { SimulationPage } from './pages/SimulationPage';
import { CreditAssessmentPage } from './pages/CreditAssessmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { SettingsPage } from './pages/SettingsPage';

function WorkspaceShell() {
  const { activePage } = useWorkspace();

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'evidence-network':
        return <EvidenceGraphPage />;
      case 'document-upload':
        return <UploadPage />;
      case 'document-verification':
        return <VerificationPage />;
      case 'transaction-investigation':
        return <TransactionNetworkPage />;
      case 'ai-investigator':
        return <InvestigatorPage />;
      case 'simulation-lab':
        return <SimulationPage />;
      case 'credit-assessment':
        return <CreditAssessmentPage />;
      case 'reports':
        return <ReportsPage />;
      case 'audit-trail':
        return <AuditTrailPage />;
      case 'integrations':
        return <SettingsPage section="integrations" />;
      case 'settings':
        return <SettingsPage section="settings" />;
      case 'help':
        return <SettingsPage section="help" />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#F7FAF8] text-[#17231E]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopHeader />
        <main
          className={`flex-1 min-h-0 ${
            activePage === 'overview' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <WorkspaceShell />
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
