import React from 'react';
import {
  Activity,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Scale,
  SearchCheck,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageRoute } from '../../types/evidenceos';

interface NavItem {
  id: PageRoute;
  index: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'overview', index: '01', label: 'Overview', icon: LayoutGrid },
  { id: 'evidence-network', index: '02', label: 'Evidence Network', icon: Network },
  { id: 'document-upload', index: '03', label: 'Document Upload', icon: FileUp },
  { id: 'document-verification', index: '04', label: 'Document Verification', icon: FileCheck2 },
  { id: 'transaction-investigation', index: '05', label: 'Transaction Investigation', icon: GitBranch },
  { id: 'ai-investigator', index: '06', label: 'AI Investigator', icon: SearchCheck },
  { id: 'simulation-lab', index: '07', label: 'Simulation Lab', icon: SlidersHorizontal },
  { id: 'credit-assessment', index: '08', label: 'Credit Assessment', icon: Scale },
  { id: 'reports', index: '09', label: 'Reports', icon: FileSpreadsheet },
  { id: 'audit-trail', index: '10', label: 'Audit Trail', icon: Activity },
];

const SECONDARY_NAV: Array<{
  id: PageRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

export function Sidebar() {
  const {
    activePage,
    setActivePage,
    sidebarCollapsed,
    setSidebarCollapsed,
    user,
    findings,
  } = useWorkspace();

  const openCriticalCount = findings.filter(
    (f) => f.severity === 'Critical' && f.status !== 'Resolved'
  ).length;

  return (
    <aside
      className={`no-print shrink-0 bg-white border-r border-[#DCE7DF] flex flex-col transition-[width] duration-200 select-none ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
    >
      {/* Brand Lockup */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-[#DCE7DF]">
        <button
          type="button"
          onClick={() => setActivePage('overview')}
          className="flex items-center gap-2.5 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] rounded-md"
          title="EvidenceOS — Financial Evidence Intelligence"
        >
          <div className="w-8 h-8 rounded-lg bg-[#176B45] flex items-center justify-center shrink-0 text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="font-display font-bold text-[15px] tracking-tight text-[#17231E] leading-none truncate">
                EvidenceOS
              </div>
              <div className="text-[11px] text-[#64746B] mt-0.5 truncate">
                Evidence Intelligence
              </div>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 text-[#64746B] hover:text-[#17231E] hover:bg-[#F0F5F1] rounded-md transition-colors shrink-0"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Main navigation">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              title={sidebarCollapsed ? `${item.index}. ${item.label}` : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#DDEFE3] text-[#104B32] font-semibold'
                  : 'text-[#17231E] hover:bg-[#F0F5F1] font-medium'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#176B45]' : 'text-[#64746B]'
                }`}
              />
              {!sidebarCollapsed && (
                <>
                  <span className="font-mono-num text-[11px] text-[#64746B] w-4 shrink-0">
                    {item.index}
                  </span>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.id === 'transaction-investigation' && openCriticalCount > 0 && (
                    <span className="font-mono-num text-[11px] font-semibold text-[#DC4545]">
                      {openCriticalCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Utility Navigation */}
      <div className="border-t border-[#DCE7DF] py-2.5 px-2 space-y-0.5">
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#DDEFE3] text-[#104B32] font-semibold'
                  : 'text-[#64746B] hover:text-[#17231E] hover:bg-[#F0F5F1] font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Compact Profile Strip */}
        <button
          type="button"
          onClick={() => setActivePage('settings')}
          className="w-full mt-1 pt-2 border-t border-[#DCE7DF] px-2 py-1.5 flex items-center gap-2.5 rounded-lg hover:bg-[#F0F5F1] transition-colors text-left"
          title="User profile and workspace settings"
        >
          <div className="w-7 h-7 rounded-full bg-[#104B32] text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#17231E] truncate">
                {user?.displayName || 'Guest Analyst'}
              </div>
              <div className="text-[11px] text-[#64746B] truncate">
                {user ? 'Firebase synced' : 'Local demo session'}
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
