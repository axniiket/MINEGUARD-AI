import React, { useEffect, useState } from 'react';
import { getComplianceEvents, getMines, createComplianceEvent, completeComplianceEvent } from '@/api/client';
import { ComplianceEvent, Mine } from '@/types';
import { Calendar, Plus, CheckCircle2, AlertTriangle, Clock, Filter, ShieldCheck, X, Loader2, Bell } from 'lucide-react';

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMine, setSelectedMine] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  
  // Form state
  const [mineId, setMineId] = useState('');
  const [title, setTitle] = useState('');
  const [regulationCode, setRegulationCode] = useState('');
  const [category, setCategory] = useState('safety');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('high');
  const [assignedTo, setAssignedTo] = useState('');

  const fetchData = async () => {
    try {
      const [eventsData, minesData] = await Promise.all([getComplianceEvents(), getMines()]);
      setEvents(eventsData);
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
    if (!mineId || !title || !dueDate) return;
    setSubmitting(true);
    try {
      await createComplianceEvent({
        mine_id: mineId,
        title,
        regulation_code: regulationCode || undefined,
        category,
        due_date: dueDate,
        priority,
        assigned_to: assignedTo || undefined,
      });
      setIsModalOpen(false);
      setTitle('');
      setRegulationCode('');
      setDueDate('');
      setAssignedTo('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await completeComplianceEvent(id);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCompletingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date(today);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedMine && ev.mine_id !== selectedMine) return false;
    if (categoryFilter && ev.category !== categoryFilter) return false;
    if (statusFilter === 'pending') return ev.status === 'pending' && ev.due_date >= today;
    if (statusFilter === 'overdue') return ev.status === 'overdue' || (ev.status === 'pending' && ev.due_date < today);
    if (statusFilter === 'completed') return ev.status === 'completed';
    return true;
  });

  const getMineName = (id: string) => mines.find((m) => m.id === id)?.name || 'Coal Mine';

  const overdueCount = events.filter((ev) => ev.status === 'overdue' || (ev.status === 'pending' && ev.due_date < today)).length;
  const upcomingCount = events.filter((ev) => ev.status === 'pending' && ev.due_date >= today && getDaysRemaining(ev.due_date) <= 7).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-green-600" size={28} /> Statutory Compliance Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track mandatory DGMS filings, environmental renewals, and safety audit deadlines
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center shadow-sm hover:shadow-md transition-all text-sm"
        >
          <Plus size={18} className="mr-1.5" /> Add Compliance Deadline
        </button>
      </div>

      {/* Reminder Banner */}
      {(overdueCount > 0 || upcomingCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {overdueCount > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900">{overdueCount} Statutory Deadlines Overdue</h4>
                  <p className="text-xs text-red-700">Immediate DGMS compliance filing required to prevent notice</p>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter('overdue')}
                className="text-xs font-bold text-red-700 underline ml-2 whitespace-nowrap"
              >
                View Overdue
              </button>
            </div>
          )}
          {upcomingCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">{upcomingCount} Audits Due Within 7 Days</h4>
                  <p className="text-xs text-amber-700">Prepare survey reports & field certifications</p>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter('pending')}
                className="text-xs font-bold text-amber-700 underline ml-2 whitespace-nowrap"
              >
                View Upcoming
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Filter size={15} className="mr-1.5 text-gray-400" /> Filter:
          </div>

          <select
            value={selectedMine}
            onChange={(e) => setSelectedMine(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="">All Mines ({mines.length})</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="safety">Safety Audit</option>
            <option value="environmental">Environmental</option>
            <option value="equipment">Equipment</option>
            <option value="statutory">Statutory Filing</option>
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'pending', 'overdue', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                statusFilter === tab
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Loading compliance calendar...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((ev) => {
            const isCompleted = ev.status === 'completed';
            const daysLeft = getDaysRemaining(ev.due_date);
            const isOverdue = !isCompleted && (ev.status === 'overdue' || daysLeft < 0);

            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl shadow-xs border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150 ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/20'
                    : isCompleted
                    ? 'border-gray-200 opacity-80'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">{ev.title}</h3>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                      {getMineName(ev.mine_id)}
                    </span>
                    {ev.regulation_code && (
                      <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {ev.regulation_code}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-0.5">
                    <span className="capitalize font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      Category: {ev.category}
                    </span>
                    {ev.assigned_to && (
                      <span>
                        Officer: <strong>{ev.assigned_to}</strong>
                      </span>
                    )}
                    <span className="flex items-center text-gray-500">
                      <Calendar size={13} className="mr-1 text-gray-400" /> Due:{' '}
                      <strong className="text-gray-900 ml-1">{ev.due_date}</strong>
                    </span>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={14} className="mr-1 text-emerald-600" /> Completed
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 animate-pulse">
                        <AlertTriangle size={14} className="mr-1 text-red-600" /> {Math.abs(daysLeft)} Days Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <Clock size={14} className="mr-1 text-amber-600" /> Due in {daysLeft} Days
                      </span>
                    )}
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => handleComplete(ev.id)}
                      disabled={completingId === ev.id}
                      className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 flex items-center"
                    >
                      {completingId === ev.id ? (
                        <Loader2 size={13} className="animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 size={13} className="mr-1" />
                      )}
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200">
              No compliance events found for the selected criteria.
            </div>
          )}
        </div>
      )}

      {/* Add Compliance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Add Compliance Deadline</h2>
            <p className="text-xs text-gray-500 mb-4">
              Schedule a statutory audit, permit renewal, or DGMS compliance milestone
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Mine Site *
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={mineId}
                  onChange={(e) => setMineId(e.target.value)}
                >
                  <option value="">Select mine...</option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Compliance Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Quarterly Mine Air Velocity & Gas Survey"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Regulation Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DGMS-CMR-Reg-153"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={regulationCode}
                    onChange={(e) => setRegulationCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="safety">Safety Audit</option>
                    <option value="environmental">Environmental</option>
                    <option value="equipment">Equipment</option>
                    <option value="statutory">Statutory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="critical">Critical (DGMS Order)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Responsible Officer / Cell
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ventilation Officer / Safety Cell"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : 'Schedule Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
