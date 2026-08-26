import React, { useEffect, useState } from 'react';
import { getCorrectiveActions, getMines, createCorrectiveAction, updateCorrectiveAction } from '@/api/client';
import { CorrectiveAction, Mine } from '@/types';
import { CheckCircle2, AlertOctagon, Clock, Plus, Filter, ShieldAlert, X, Loader2, ArrowUpRight, Check, FileCheck } from 'lucide-react';

export default function CorrectiveActionsPage() {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMine, setSelectedMine] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mineId, setMineId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('high');

  // Action / Evidence / Escalate Modal state
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [actionModalMode, setActionModalMode] = useState<'close' | 'escalate' | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [actionsData, minesData] = await Promise.all([getCorrectiveActions(), getMines()]);
      setActions(actionsData);
      setMines(minesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mineId || !title || !deadline) return;
    setSubmitting(true);
    try {
      await createCorrectiveAction({
        mine_id: mineId,
        title,
        description,
        assigned_to_name: assignedToName || undefined,
        deadline,
        priority,
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setAssignedToName('');
      setDeadline('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateCorrectiveAction(id, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;
    setUpdatingId(selectedAction.id);
    try {
      await updateCorrectiveAction(selectedAction.id, {
        is_escalated: true,
        escalation_reason: escalateReason || 'Escalated by supervisor for high regulatory compliance risk',
      });
      setActionModalMode(null);
      setSelectedAction(null);
      setEscalateReason('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction || !evidenceText) return;
    setUpdatingId(selectedAction.id);
    try {
      await updateCorrectiveAction(selectedAction.id, {
        status: 'completed',
        closure_evidence: evidenceText,
      });
      setActionModalMode(null);
      setSelectedAction(null);
      setEvidenceText('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredActions = actions.filter((act) => {
    if (selectedMine && act.mine_id !== selectedMine) return false;
    if (statusFilter === 'in_progress') return act.status === 'in_progress';
    if (statusFilter === 'escalated') return act.is_escalated || act.status === 'escalated';
    if (statusFilter === 'pending') return act.status === 'pending';
    if (statusFilter === 'completed') return act.status === 'completed';
    return true;
  });

  const getMineName = (id: string) => mines.find((m) => m.id === id)?.name || 'Coal Mine';

  const escalatedCount = actions.filter((a) => a.is_escalated || a.status === 'escalated').length;
  const inProgressCount = actions.filter((a) => a.status === 'in_progress').length;
  const pendingCount = actions.filter((a) => a.status === 'pending').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" size={28} /> Corrective Action Workflow
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign, escalate, and verify remediation evidence for safety and environmental violations
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center shadow-sm hover:shadow-md transition-all text-sm"
        >
          <Plus size={18} className="mr-1.5" /> Assign New Action
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-xs border border-red-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">Escalated Actions</p>
            <p className="text-3xl font-extrabold text-red-700 mt-1">{escalatedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 text-red-600">
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-blue-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">In Progress</p>
            <p className="text-3xl font-extrabold text-blue-700 mt-1">{inProgressCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-amber-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Assignment</p>
            <p className="text-3xl font-extrabold text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FileCheck size={24} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Filter size={15} className="mr-1.5 text-gray-400" /> Filter:
          </div>

          <select
            value={selectedMine}
            onChange={(e) => setSelectedMine(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Mines ({mines.length})</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'in_progress', 'escalated', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                statusFilter === tab
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Actions List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Loading corrective actions...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredActions.map((act) => {
            const isEscalated = act.is_escalated || act.status === 'escalated';
            const isCompleted = act.status === 'completed';
            const isOverdue = !isCompleted && act.deadline < today;

            return (
              <div
                key={act.id}
                className={`bg-white rounded-2xl shadow-xs border p-5 space-y-4 transition-all ${
                  isEscalated
                    ? 'border-red-300 bg-red-50/20'
                    : isCompleted
                    ? 'border-gray-200 opacity-80'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">{act.title}</h3>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {getMineName(act.mine_id)}
                      </span>
                      {isEscalated && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800 animate-pulse">
                          <AlertOctagon size={12} className="mr-1" /> Escalated to DGMS
                        </span>
                      )}
                    </div>
                    {act.description && (
                      <p className="text-sm text-gray-700 leading-relaxed">{act.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        act.priority === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : act.priority === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      Priority: {act.priority}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isEscalated
                          ? 'bg-red-100 text-red-800'
                          : act.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Escalation reason if present */}
                {isEscalated && act.escalation_reason && (
                  <div className="p-3 bg-red-100/60 border border-red-200 rounded-xl text-xs text-red-900">
                    <strong>Escalation Reason:</strong> {act.escalation_reason}
                  </div>
                )}

                {/* Closure Evidence if completed */}
                {isCompleted && act.closure_evidence && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <strong>Closure Evidence & Resolution:</strong> {act.closure_evidence}
                  </div>
                )}

                {/* Footer details & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex flex-wrap items-center gap-4">
                    <span>
                      Assigned to: <strong className="text-gray-800">{act.assigned_to_name || 'Unassigned'}</strong>
                    </span>
                    <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                      Deadline: <strong className="text-gray-800">{act.deadline}</strong> {isOverdue && '(Overdue)'}
                    </span>
                  </div>

                  {!isCompleted && (
                    <div className="flex items-center gap-2">
                      {act.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(act.id, 'in_progress')}
                          disabled={updatingId === act.id}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                        >
                          Start Progress
                        </button>
                      )}

                      {!isEscalated && (
                        <button
                          onClick={() => {
                            setSelectedAction(act);
                            setActionModalMode('escalate');
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center"
                        >
                          <ArrowUpRight size={13} className="mr-1" /> Escalate
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAction(act);
                          setActionModalMode('close');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center shadow-xs"
                      >
                        <Check size={13} className="mr-1" /> Complete & Submit Evidence
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredActions.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200">
              No corrective actions match the selected filter.
            </div>
          )}
        </div>
      )}

      {/* Assign Action Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-8">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Assign Corrective Action</h2>
            <p className="text-xs text-gray-500 mb-4">
              Create a formal remedial task with deadlines and assigned personnel
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Mine Site *
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={mineId}
                  onChange={(e) => setMineId(e.target.value)}
                >
                  <option value="">Select mine site...</option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Action Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rectify ventilation booster fan cabling in Zone 3"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Remediation Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Technical instructions, safety requirements, or parts required..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Assignee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Completion Deadline *
                </label>
                <input
                  required
                  type="date"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {actionModalMode === 'escalate' && selectedAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setActionModalMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-extrabold text-red-600 mb-1 flex items-center gap-1.5">
              <AlertOctagon size={20} /> Escalate to DGMS Authority
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Escalates priority and notifies regional mining regulators of non-compliance risk.
            </p>

            <form onSubmit={handleEscalateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Reason for Escalation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why deadline was breached or safety risk increased..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActionModalMode(null)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === selectedAction.id}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closure Evidence Modal */}
      {actionModalMode === 'close' && selectedAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setActionModalMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={20} className="text-emerald-600" /> Complete Action & Submit Evidence
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Enter verification notes or resolution evidence to formally close this action item.
            </p>

            <form onSubmit={handleCloseSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Closure Evidence & Field Verification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the work carried out, measurements taken, parts installed, and verification timestamp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActionModalMode(null)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === selectedAction.id}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
