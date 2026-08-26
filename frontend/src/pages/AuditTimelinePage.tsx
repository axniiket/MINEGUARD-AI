import React, { useEffect, useState } from 'react';
import { getAuditLogs, getMines } from '@/api/client';
import { AuditLog, Mine } from '@/types';
import { History, Filter, User, Calendar, ShieldCheck, Tag } from 'lucide-react';

export default function AuditTimelinePage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMine, setSelectedMine] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const [logsData, minesData] = await Promise.all([
        getAuditLogs(selectedMine || undefined, entityFilter || undefined),
        getMines(),
      ]);
      setLogs(logsData);
      setMines(minesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMine, entityFilter]);

  const getMineName = (id?: string | null) => {
    if (!id) return 'All Sites';
    return mines.find((m) => m.id === id)?.name || 'Coal Mine';
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <History className="text-indigo-600" size={28} /> Governance Audit Trail
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Immutable chronological ledger of all inspection creates, OCR uploads, corrective actions, and regulator escalations
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <Filter size={15} className="mr-1.5 text-gray-400" /> Filter Log:
        </div>

        <select
          value={selectedMine}
          onChange={(e) => setSelectedMine(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Mines</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Entity Types</option>
          <option value="inspection">Inspections</option>
          <option value="corrective_action">Corrective Actions</option>
          <option value="compliance">Compliance Calendar</option>
          <option value="mine">Mine Operations</option>
        </select>

        {(selectedMine || entityFilter) && (
          <button
            onClick={() => {
              setSelectedMine('');
              setEntityFilter('');
            }}
            className="text-xs text-red-600 hover:underline font-semibold ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Loading audit ledger...</div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-200 space-y-6 my-4">
          {logs.map((log) => {
            const actionBadgeColor =
              log.action_type === 'CREATE'
                ? 'bg-emerald-100 text-emerald-800'
                : log.action_type === 'ESCALATE'
                ? 'bg-red-100 text-red-800'
                : log.action_type === 'UPLOAD_OCR'
                ? 'bg-purple-100 text-purple-800'
                : log.action_type === 'ASSIGN_ACTION'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800';

            return (
              <div key={log.id} className="relative group">
                {/* Node dot on line */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-xs"></div>

                <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 space-y-2 hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${actionBadgeColor}`}>
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                        {log.entity_type.replace(/_/g, ' ')}
                      </span>
                      {log.mine_id && (
                        <span className="text-xs text-gray-500 font-medium">
                          &bull; {getMineName(log.mine_id)}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-gray-400 font-medium flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                    {log.details}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
                    <User size={13} className="text-gray-400" />
                    <span>
                      Actor: <strong className="text-gray-800">{log.user_name || 'System Service'}</strong>
                    </span>
                    {log.user_role && (
                      <span className="capitalize bg-gray-100 text-gray-600 px-2 py-0.2 rounded text-[11px]">
                        {log.user_role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
              No audit logs recorded for the selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
