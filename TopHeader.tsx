import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  FileUp,
  LogIn,
  LogOut,
  Search,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageRoute } from '../../types/evidenceos';

const PAGE_META: Record<PageRoute, { title: string; breadcrumb: string }> = {
  overview: { title: 'Financial Intelligence Workspace', breadcrumb: 'Overview' },
  'evidence-network': { title: 'Evidence Knowledge Graph', breadcrumb: 'Graphs / Evidence Network' },
  'document-upload': { title: 'Document Upload', breadcrumb: 'Ingestion / Upload' },
  'document-verification': { title: 'Document Verification', breadcrumb: 'Ingestion / Verification' },
  'transaction-investigation': {
    title: 'Transaction Investigation',
    breadcrumb: 'Graphs / Transaction Network',
  },
  'ai-investigator': { title: 'AI Investigator', breadcrumb: 'Investigation / Agent' },
  'simulation-lab': { title: 'Simulation Lab', breadcrumb: 'Stress Testing / Simulation Lab' },
  'credit-assessment': { title: 'Credit Assessment', breadcrumb: 'Readiness / Loan Capacity' },
  reports: { title: 'Investigation Reports', breadcrumb: 'Reporting / Exports' },
  'audit-trail': { title: 'Audit Trail', breadcrumb: 'Governance / Audit Log' },
  integrations: { title: 'Integrations & Services', breadcrumb: 'System / Integrations' },
  settings: { title: 'Workspace Settings', breadcrumb: 'System / Settings' },
  help: { title: 'Methodology & Help', breadcrumb: 'System / Help' },
};

export function TopHeader() {
  const {
    activePage,
    setActivePage,
    activeWorkspace,
    workspaces,
    setActiveWorkspaceId,
    backendHealth,
    globalSearchQuery,
    setGlobalSearchQuery,
    documents,
    findings,
    evidenceNodes,
    openDocumentInVerification,
    selectFindingAndHighlight,
    setGraphHighlight,
    user,
    authLoading,
    loginWithGoogle,
    logout,
  } = useWorkspace();

  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const meta = PAGE_META[activePage];
  const openFindings = findings.filter((f) => f.status !== 'Resolved');

  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;
    return {
      nodes: evidenceNodes
        .filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            n.identifier.toLowerCase().includes(q) ||
            n.nodeType.toLowerCase().includes(q)
        )
        .slice(0, 4),
      docs: documents
        .filter(
          (d) =>
            d.fileName.toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q) ||
            d.subcategory.toLowerCase().includes(q)
        )
        .slice(0, 4),
      findings: findings
        .filter(
          (f) =>
            f.title.toLowerCase().includes(q) ||
            f.affectedEntity.toLowerCase().includes(q) ||
            f.reason.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [globalSearchQuery, evidenceNodes, documents, findings]);

  return (
    <header className="no-print h-14 bg-white border-b border-[#DCE7DF] px-4 lg:px-5 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Left: Page title & Breadcrumb */}
      <div className="min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-[#64746B] leading-none truncate">
            EvidenceOS / {meta.breadcrumb}
          </div>
          <h1 className="font-display font-semibold text-[15px] text-[#17231E] leading-tight mt-0.5 truncate">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#64746B] absolute left-3 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            placeholder="Search entities, invoices, transactions, documents..."
            className="w-full h-9 pl-8 pr-8 text-[13px] bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg text-[#17231E] placeholder:text-[#64746B] focus:outline-none focus:border-[#176B45] focus:bg-white transition-colors"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-2.5 text-[#64746B] hover:text-[#17231E]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchFocused && searchResults && (
          <div className="absolute left-0 right-0 top-10 bg-white border border-[#DCE7DF] rounded-xl shadow-lg p-2 z-50 max-h-96 overflow-y-auto">
            {searchResults.nodes.length === 0 &&
            searchResults.docs.length === 0 &&
            searchResults.findings.length === 0 ? (
              <div className="p-3 text-xs text-[#64746B]">
                No matching entities, documents, or findings for &ldquo;{globalSearchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.nodes.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-semibold text-[#64746B]">
                      Graph Entities
                    </div>
                    {searchResults.nodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onMouseDown={() => {
                          setGraphHighlight({
                            nodeIds: [n.id],
                            edgeIds: [],
                            reasonLabel: `Search match: ${n.label}`,
                            source: 'finding',
                          });
                          setActivePage('overview');
                          setSearchFocused(false);
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs rounded-md hover:bg-[#F0F5F1] flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-[#17231E] truncate">{n.label}</span>
                        <span className="font-mono-num text-[11px] text-[#64746B] shrink-0">
                          {n.identifier}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.findings.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-semibold text-[#64746B]">
                      Verification Findings
                    </div>
                    {searchResults.findings.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onMouseDown={() => {
                          selectFindingAndHighlight(f);
                          setActivePage('overview');
                          setSearchFocused(false);
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs rounded-md hover:bg-[#F0F5F1] flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-[#17231E] truncate">{f.title}</span>
                        <span className="text-[11px] text-[#DC4545] shrink-0">{f.severity}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.docs.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-semibold text-[#64746B]">
                      Documents
                    </div>
                    {searchResults.docs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onMouseDown={() => {
                          openDocumentInVerification(d.id);
                          setSearchFocused(false);
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs rounded-md hover:bg-[#F0F5F1] flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-[#17231E] truncate">{d.fileName}</span>
                        <span className="font-mono-num text-[11px] text-[#64746B] shrink-0">
                          {d.id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Workspace Selector, Notifications, Upload CTA, Auth */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Workspace Selector + Transparent Demo Mode label */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-[#DCE7DF] bg-[#F7FAF8] text-xs text-[#17231E]">
          <Building2 className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
          <select
            aria-label="Active business workspace"
            value={activeWorkspace.id}
            onChange={(e) => setActiveWorkspaceId(e.target.value)}
            className="bg-transparent font-medium text-[#17231E] focus:outline-none pr-1 cursor-pointer"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {backendHealth.demoMode && (
            <span className="text-[11px] font-semibold text-[#D99124] border-l border-[#DCE7DF] pl-2 whitespace-nowrap">
              Demo Mode
            </span>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative h-9 w-9 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] flex items-center justify-center text-[#17231E] transition-colors"
            title="Evidence Alerts & Notifications"
            aria-label="Evidence Alerts & Notifications"
          >
            <Bell className="w-4 h-4 text-[#64746B]" />
            {openFindings.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC4545] text-white text-[10px] font-semibold font-mono-num flex items-center justify-center">
                {openFindings.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-[#DCE7DF] rounded-xl shadow-lg p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE7DF]">
                <span className="text-xs font-semibold text-[#17231E]">
                  Open Evidence Alerts ({openFindings.length})
                </span>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-[#64746B] hover:text-[#17231E]"
                >
                  Close
                </button>
              </div>
              <div className="divide-y divide-[#DCE7DF] max-h-72 overflow-y-auto mt-1">
                {openFindings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      selectFindingAndHighlight(f);
                      setActivePage('overview');
                      setNotifOpen(false);
                    }}
                    className="w-full py-2.5 text-left hover:bg-[#F7FAF8] rounded px-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#17231E] truncate">{f.title}</span>
                      <span
                        className={`text-[11px] font-medium shrink-0 ${
                          f.severity === 'Critical'
                            ? 'text-[#DC4545]'
                            : f.severity === 'Warning'
                              ? 'text-[#D99124]'
                              : 'text-[#64746B]'
                        }`}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64746B] mt-0.5 truncate">
                      {f.affectedEntity}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Evidence Primary CTA */}
        <button
          type="button"
          onClick={() => setActivePage('document-upload')}
          className="h-9 px-3.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Upload Evidence</span>
        </button>

        {/* Firebase Google Sign-In / Profile */}
        {user ? (
          <button
            type="button"
            onClick={logout}
            disabled={authLoading}
            className="h-9 px-2.5 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-medium text-[#17231E] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            title={`Signed in as ${user.email}. Click to sign out.`}
          >
            <span className="w-5 h-5 rounded-full bg-[#176B45] text-white text-[10px] font-semibold flex items-center justify-center">
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[96px] truncate">
              {user.displayName?.split(' ')[0] || 'Account'}
            </span>
            <LogOut className="w-3.5 h-3.5 text-[#64746B]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={authLoading}
            className="h-9 px-3 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-medium text-[#17231E] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            title="Sign in with Google to persist documents, corrections, simulations, and audit logs to Firestore"
          >
            <LogIn className="w-3.5 h-3.5 text-[#176B45]" />
            <span>{authLoading ? 'Signing in...' : 'Sign in'}</span>
            <ChevronDown className="w-3 h-3 text-[#64746B] hidden sm:inline" />
          </button>
        )}
      </div>
    </header>
  );
}
