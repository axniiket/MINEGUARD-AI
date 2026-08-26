import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMineDashboard, getMineLinkedCounts, archiveMine, unarchiveMine, deleteMine } from '@/api/client';
import { MineDashboard } from '@/types';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowLeft,
  Target,
  ClipboardList,
  AlertCircle,
  MapPin,
  ChevronRight,
  Calendar,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export default function MineDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [dashboard, setDashboard] = useState<MineDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete & Archive Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [linkedCounts, setLinkedCounts] = useState<{
    inspections_count: number;
    alerts_count: number;
    compliance_events_count: number;
    corrective_actions_count: number;
    documents_count: number;
    total_linked: number;
    can_delete: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchDashboard = () => {
    if (id) {
      getMineDashboard(id)
        .then((data) => {
          setDashboard(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load mine operations data.');
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [id]);

  const openManageModal = async () => {
    if (!id) return;
    setActionError('');
    setIsManageModalOpen(true);
    try {
      const counts = await getMineLinkedCounts(id);
      setLinkedCounts(counts);
    } catch (err) {
      console.error('Failed to fetch linked counts:', err);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await archiveMine(id);
      setIsManageModalOpen(false);
      fetchDashboard();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to archive mine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchive = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await unarchiveMine(id);
      setIsManageModalOpen(false);
      fetchDashboard();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to restore mine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await deleteMine(id);
      setIsManageModalOpen(false);
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail.message : detail || 'Failed to delete mine.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          <p className="font-semibold text-base">{error || 'Mine Dashboard not found.'}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  const { mine, recent_inspections, open_alerts } = dashboard;
  const score = mine.compliance_score ?? 100;
  const isArchived = mine.status === 'archived';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Admin Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to Mines
        </button>

        {isAdmin && (
          <button
            onClick={openManageModal}
            className="inline-flex items-center px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shadow-2xs"
          >
            {isArchived ? (
              <>
                <RotateCcw size={14} className="mr-1.5" /> Manage Archived Mine
              </>
            ) : (
              <>
                <Trash2 size={14} className="mr-1.5" /> Archive / Delete Mine
              </>
            )}
          </button>
        )}
      </div>

      {/* Archived Warning Banner */}
      {isArchived && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-800 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-amber-600" />
            <span>This mine site is currently <strong>Archived</strong>. It is hidden from active operational feeds.</span>
          </div>
          {isAdmin && (
            <button
              onClick={handleUnarchive}
              className="text-xs font-bold underline hover:text-amber-950 ml-4"
            >
              Restore to Active
            </button>
          )}
        </div>
      )}

      {/* Mine Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {mine.name}
          </h1>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <MapPin size={14} className="mr-1 text-gray-400" /> {mine.location}, {mine.state}
            {mine.latitude && mine.longitude && (
              <span className="text-xs text-gray-400 ml-2">
                ({mine.latitude.toFixed(4)}, {mine.longitude.toFixed(4)})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              mine.mine_type === 'opencast'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            {mine.mine_type}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isArchived
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {mine.status}
          </span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 flex items-center">
          <div className="p-3.5 rounded-xl bg-green-50 text-green-600 mr-4 flex-shrink-0">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Compliance Score
            </p>
            <p
              className={`text-2xl sm:text-3xl font-extrabold mt-0.5 ${
                score > 80 ? 'text-green-600' : score > 60 ? 'text-yellow-600' : 'text-red-600'
              }`}
            >
              {score}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 flex items-center">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 mr-4 flex-shrink-0">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Audits
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-0.5">
              {dashboard.total_inspections ?? recent_inspections.length}
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('/alerts')}
          className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 flex items-center cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
        >
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 mr-4 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Open Alerts
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-0.5">{open_alerts}</p>
          </div>
        </div>
      </div>

      {/* Recent Inspections Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent On-Site Inspections</h2>
          <button
            onClick={() => navigate('/inspections')}
            className="text-xs font-semibold text-green-700 hover:text-green-800 uppercase tracking-wider"
          >
            All Inspections &rarr;
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Inspection Title</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">AI Severity</th>
                  <th className="px-6 py-3.5 text-center">Risk Score</th>
                  <th className="px-6 py-3.5 text-right">Date</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent_inspections.map((ins) => (
                  <tr
                    key={ins.id}
                    onClick={() => navigate(`/inspections/${ins.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 group-hover:text-green-700">
                      {ins.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {ins.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          ins.ai_severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : ins.ai_severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : ins.ai_severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {ins.ai_severity || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {ins.ai_risk_score ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-500">
                      {new Date(ins.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-400 group-hover:text-gray-600">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-gray-100">
            {recent_inspections.map((ins) => (
              <div
                key={ins.id}
                onClick={() => navigate(`/inspections/${ins.id}`)}
                className="p-4 space-y-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-gray-900 text-sm">{ins.title}</h4>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {new Date(ins.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {ins.type}
                    </span>
                    {ins.ai_severity && (
                      <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                        {ins.ai_severity}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    Score: {ins.ai_risk_score ?? 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {recent_inspections.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              No recent inspections recorded for this mine site.
            </div>
          )}
        </div>
      </div>

      {/* Admin Safe Deletion & Archiving Confirmation Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setIsManageModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <ShieldCheck size={22} className="text-indigo-600" /> Mine Lifecycle & Safety Governance
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Review linked records for <strong>{mine.name}</strong> before archiving or deleting.
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                {actionError}
              </div>
            )}

            {/* Linked Records Assessment */}
            {linkedCounts ? (
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Linked Historical Records:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 flex justify-between">
                      <span>📋 Field Inspections:</span>
                      <strong>{linkedCounts.inspections_count}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-100 flex justify-between">
                      <span>⚠️ Risk Alerts:</span>
                      <strong>{linkedCounts.alerts_count}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-100 flex justify-between">
                      <span>📅 Compliance Events:</span>
                      <strong>{linkedCounts.compliance_events_count}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-100 flex justify-between">
                      <span>🛡️ Corrective Actions:</span>
                      <strong>{linkedCounts.corrective_actions_count}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                    <span>Total Linked Compliance Records:</span>
                    <span className="text-indigo-700 text-sm">{linkedCounts.total_linked}</span>
                  </div>
                </div>

                {/* Deletion / Archiving Advice */}
                {linkedCounts.total_linked > 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                      <span>Permanent Deletion Blocked</span>
                    </div>
                    <p className="leading-relaxed">
                      This leasehold has <strong>{linkedCounts.total_linked}</strong> active compliance records. Hard deletion is blocked to prevent accidental data loss and preserve statutory regulatory history.
                    </p>
                    <p className="font-semibold text-amber-800 pt-1">
                      Recommended Action: <strong>Archive Mine</strong> to hide it from active operational views while safely preserving all historical audits and reports.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                    ✓ No linked inspections or alerts found. This empty leasehold record can be safely deleted permanently.
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(false)}
                    className="py-2.5 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                  >
                    Cancel
                  </button>

                  {isArchived ? (
                    <button
                      onClick={handleUnarchive}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Restore to Active Status
                    </button>
                  ) : (
                    <button
                      onClick={handleArchive}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                      Archive Mine (Preserve Data)
                    </button>
                  )}

                  {linkedCounts.can_delete && (
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Permanently Delete
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span>Checking linked database records...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
