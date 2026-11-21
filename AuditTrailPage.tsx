import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { AuditEventItem } from '../types/evidenceos';

const SOURCE_LABELS: Record<AuditEventItem['sourceCategory'], { label: string; color: string }> = {
  ai_generated: { label: 'AI-Generated', color: '#176B45' },
  user_modification: { label: 'User Modification', color: '#104B32' },
  hypothetical_simulation: { label: 'Hypothetical Simulation', color: '#D99124' },
  system_ingestion: { label: 'System / Deterministic', color: '#64746B' },
};

export function AuditTrailPage() {
  const { auditEvents } = useWorkspace();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditEvents.filter((e) => {
      if (categoryFilter !== 'all' && e.sourceCategory !== categoryFilter) return false;
      if (q) {
        return (
          e.eventType.toLowerCase().includes(q) ||
          e.affectedRecord.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditEvents, categoryFilter, search]);

  return (
    <div className="p-5 max-w-[1360px] mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">Audit Trail</h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Immutable chronological log strictly separating AI-generated outputs, analyst
            modifications, and hypothetical simulations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64746B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit events..."
              className="h-9 pl-8 pr-3 text-xs bg-white border border-[#DCE7DF] rounded-lg"
            />
          </div>

          <div className="inline-flex items-center p-0.5 bg-white border border-[#DCE7DF] rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'ai_generated', label: 'AI-Generated' },
              { id: 'user_modification', label: 'User Edits' },
              { id: 'hypothetical_simulation', label: 'Simulations' },
              { id: 'system_ingestion', label: 'System' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  categoryFilter === tab.id
                    ? 'bg-[#DDEFE3] text-[#104B32] font-semibold'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7FAF8] border-b border-[#DCE7DF] text-[#64746B]">
                <th className="py-2.5 px-4 font-semibold">Event ID & Time</th>
                <th className="py-2.5 px-3 font-semibold">Provenance Class</th>
                <th className="py-2.5 px-3 font-semibold">Event Type</th>
                <th className="py-2.5 px-3 font-semibold">Affected Record</th>
                <th className="py-2.5 px-3 font-semibold">Actor</th>
                <th className="py-2.5 px-3 font-semibold">Result</th>
                <th className="py-2.5 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7DF]">
              {filtered.map((ev) => {
                const meta = SOURCE_LABELS[ev.sourceCategory];
                return (
                  <tr key={ev.id} className="hover:bg-[#F7FAF8]">
                    <td className="py-3 px-4 font-mono-num whitespace-nowrap">
                      <div className="font-medium text-[#17231E]">{ev.id}</div>
                      <div className="text-[11px] text-[#64746B]">
                        {ev.timestamp.replace('T', ' ').slice(0, 19)}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-semibold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-num text-[#17231E] whitespace-nowrap">
                      {ev.eventType}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#17231E]">{ev.affectedRecord}</td>
                    <td className="py-3 px-3 text-[#64746B]">{ev.userId}</td>
                    <td className="py-3 px-3 font-mono-num font-semibold text-[#104B32] whitespace-nowrap">
                      {ev.actionResult}
                    </td>
                    <td className="py-3 px-4 text-[#64746B] max-w-md">{ev.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
