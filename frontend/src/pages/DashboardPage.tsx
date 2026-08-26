import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMines, getAlerts, getInspections } from '@/api/client';
import { Mine, Alert, Inspection } from '@/types';
import { Bell, Activity, Target, Database, MapPin, ChevronRight, AlertTriangle, ShieldCheck, Archive } from 'lucide-react';

export default function DashboardPage() {
  const [mines, setMines] = useState<Mine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mineStatusTab, setMineStatusTab] = useState<'active' | 'archived' | 'all'>('active');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getMines(), getAlerts('active'), getInspections()])
      .then(([minesData, alertsData, insData]) => {
        setMines(minesData);
        setAlerts(alertsData);
        setInspections(insData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch dashboard data. Make sure backend is running.');
        setLoading(false);
      });
  }, []);

  const totalMines = mines.length;
  const activeMinesList = mines.filter((m) => m.status !== 'archived');
  const archivedMinesList = mines.filter((m) => m.status === 'archived');

  const avgCompliance =
    activeMinesList.length > 0
      ? activeMinesList.reduce((acc, m) => acc + (m.compliance_score || 0), 0) / activeMinesList.length
      : 0;
  const activeAlertsCount = alerts.length;

  const displayedMines =
    mineStatusTab === 'active'
      ? activeMinesList
      : mineStatusTab === 'archived'
      ? archivedMinesList
      : mines;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Governance Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Real-time statutory compliance monitoring across active coal mine leaseholds
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="underline font-semibold ml-4 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 flex items-center">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 mr-4 flex-shrink-0">
            <Database size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Mines</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-0.5">{activeMinesList.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 flex items-center">
          <div className="p-3.5 rounded-xl bg-green-50 text-green-600 mr-4 flex-shrink-0">
            <Target size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Compliance</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-green-600 mt-0.5">
              {avgCompliance.toFixed(1)}%
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('/alerts')}
          className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 flex items-center cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
        >
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 mr-4 flex-shrink-0">
            <Bell size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Alerts</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-0.5">{activeAlertsCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/inspections')}
          className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 flex items-center cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600 mr-4 flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Audits</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-0.5">
              {inspections.length}
            </p>
          </div>
        </div>
      </div>

      {/* Mines Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Coal Mine Operations</h2>
            <p className="text-xs text-gray-500">
              Select any leasehold to review telemetry, geotagged audits, and governance lifecycle
            </p>
          </div>

          {/* Status Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setMineStatusTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                mineStatusTab === 'active'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Active ({activeMinesList.length})
            </button>
            <button
              onClick={() => setMineStatusTab('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                mineStatusTab === 'archived'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Archived ({archivedMinesList.length})
            </button>
            <button
              onClick={() => setMineStatusTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                mineStatusTab === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All ({totalMines})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse space-y-4"
              >
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedMines.map((mine) => {
              const score = mine.compliance_score ?? 100;
              const mineInspections = inspections.filter((ins) => ins.mine_id === mine.id);
              const mineAlerts = alerts.filter((a) => a.mine_id === mine.id && a.status === 'active');
              const isArchived = mine.status === 'archived';

              return (
                <div
                  key={mine.id}
                  className={`bg-white rounded-2xl shadow-xs border p-6 flex flex-col justify-between transition-all duration-200 ${
                    isArchived
                      ? 'border-amber-200 bg-amber-50/15 opacity-85'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 tracking-tight">{mine.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin size={13} className="mr-1 text-gray-400 flex-shrink-0" />
                          {mine.location}, {mine.state}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider flex-shrink-0 ${
                            mine.mine_type === 'opencast'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          }`}
                        >
                          {mine.mine_type}
                        </span>
                        {isArchived && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            <Archive size={10} className="mr-1" /> Archived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                        <span className="text-gray-500">Compliance Health</span>
                        <span
                          className={`font-bold text-sm ${
                            score > 80 ? 'text-green-600' : score > 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}
                        >
                          {score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            score > 80 ? 'bg-green-500' : score > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Summary Badges */}
                    <div className="flex items-center justify-between text-xs py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">
                        📋 <strong>{mineInspections.length}</strong> audits
                      </span>
                      <span className={mineAlerts.length > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}>
                        ⚠️ <strong>{mineAlerts.length}</strong> active alerts
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/mines/${mine.id}`)}
                    className="mt-5 w-full py-2.5 px-4 bg-gray-900 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 group"
                  >
                    <span>View Site Dashboard</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })}

            {displayedMines.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                No mines found in the {mineStatusTab} view.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
