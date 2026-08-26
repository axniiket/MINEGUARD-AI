import React, { useEffect, useState } from 'react';
import { getAlerts, resolveAlert, getMines } from '@/api/client';
import { Alert, Mine } from '@/types';
import { CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Resolved'>('All');
  const [selectedMine, setSelectedMine] = useState<string>('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlertsAndMines = async () => {
    try {
      const [alertsData, minesData] = await Promise.all([getAlerts(), getMines()]);
      setAlerts(alertsData);
      setMines(minesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndMines();
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'Active' && a.status !== 'active') return false;
    if (filter === 'Resolved' && a.status !== 'resolved') return false;
    if (selectedMine && a.mine_id !== selectedMine) return false;
    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  const getMineName = (mineId: string) => {
    const mine = mines.find((m) => m.id === mineId);
    return mine ? mine.name : 'Coal Mine';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-600" size={28} /> Risk & Compliance Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold text-red-600">{activeCount} active</span> issues requiring attention &bull;{' '}
            <span className="text-green-600 font-medium">{resolvedCount} resolved</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMine}
            onChange={(e) => setSelectedMine(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="">All Mines</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
            {(['All', 'Active', 'Resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading alerts feed...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAlerts.map((alert) => {
            const severityColor =
              alert.severity === 'critical'
                ? 'bg-red-500'
                : alert.severity === 'high'
                ? 'bg-orange-500'
                : alert.severity === 'medium'
                ? 'bg-yellow-500'
                : 'bg-green-500';

            const typeLabel = alert.type.replace(/_/g, ' ');

            return (
              <div
                key={alert.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex relative hover:shadow-md transition-shadow"
              >
                <div className={`w-2.5 flex-shrink-0 ${severityColor}`}></div>
                <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-lg">{alert.title}</h3>
                      <span className="text-xs font-medium text-gray-400">
                        &bull; {getMineName(alert.mine_id)}
                      </span>
                      {alert.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <span className="h-1.5 w-1.5 mr-1.5 rounded-full bg-red-600 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} className="mr-1 text-green-600" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {typeLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : alert.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="whitespace-nowrap px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-semibold hover:bg-green-600 hover:text-white hover:border-green-600 flex items-center justify-center transition-all duration-150 disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      {resolvingId === alert.id ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAlerts.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-100">
              No alerts match the selected filter criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
