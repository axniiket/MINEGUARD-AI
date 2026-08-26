import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskAnalytics } from '@/api/client';
import { RiskAnalytics } from '@/types';
import { ShieldAlert, TrendingUp, AlertTriangle, AlertOctagon, CheckCircle2, ChevronRight, Activity, Flame } from 'lucide-react';

export default function RiskAnalyticsPage() {
  const [analytics, setAnalytics] = useState<RiskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getRiskAnalytics()
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-8 text-center text-red-500">Failed to load risk analytics.</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Activity className="text-red-600" size={28} /> Rule-Based Risk & Compliance Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Automated risk indexing, recurring hazard detection, and DGMS compliance trends
        </p>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mines Under Review</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{analytics.status_summary.total_mines}</p>
          <p className="text-xs text-gray-400 mt-1">100% telemetry coverage</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-red-200 p-5 bg-red-50/20">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Active Risk Alerts</p>
          <p className="text-3xl font-extrabold text-red-700 mt-1">{analytics.status_summary.active_alerts}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Require immediate verification</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-amber-200 p-5 bg-amber-50/20">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Overdue Actions</p>
          <p className="text-3xl font-extrabold text-amber-700 mt-1">{analytics.overdue_actions_count}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Breached resolution deadline</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-purple-200 p-5 bg-purple-50/20">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Overdue Compliance</p>
          <p className="text-3xl font-extrabold text-purple-700 mt-1">{analytics.overdue_compliance_count}</p>
          <p className="text-xs text-purple-600 font-medium mt-1">DGMS / MOEFCC statutory delay</p>
        </div>
      </div>

      {/* High-Risk Mines Ranking */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Flame className="text-red-500" size={20} /> High-Risk Mines Priority Ranking
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranked by automated composite risk formula: (100 - Score)*0.4 + CriticalAlerts*20 + OverdueItems*10
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">Mine Site</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5 text-center">Compliance Score</th>
                <th className="px-5 py-3.5 text-center">Active Alerts</th>
                <th className="px-5 py-3.5 text-center">Overdue Items</th>
                <th className="px-5 py-3.5 text-center">Calculated Risk Index</th>
                <th className="px-5 py-3.5 text-center">Risk Tier</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.high_risk_mines.map((item, idx) => (
                <tr key={item.mine_id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4 font-bold text-gray-400">#{idx + 1}</td>
                  <td className="px-5 py-4 font-bold text-gray-900">{item.mine_name}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{item.location}, {item.state}</td>
                  <td className="px-5 py-4 text-center font-bold text-gray-900">{item.compliance_score}%</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-bold ${item.open_alerts > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {item.open_alerts} ({item.critical_alerts} crit)
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-amber-600">{item.overdue_items}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-base font-extrabold text-gray-900">{item.calculated_risk_index}</span>
                    <span className="text-xs text-gray-400"> / 100</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        item.risk_tier === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : item.risk_tier === 'HIGH'
                          ? 'bg-orange-100 text-orange-800'
                          : item.risk_tier === 'MODERATE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.risk_tier}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => navigate(`/mines/${item.mine_id}`)}
                      className="text-xs font-bold text-green-700 hover:underline whitespace-nowrap"
                    >
                      Inspect &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Recurring Violations & Compliance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recurring Violations */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Recurring Violation Patterns
          </h3>
          <p className="text-xs text-gray-500">
            Detected multi-site non-compliance patterns requiring executive regulatory intervention
          </p>

          <div className="space-y-3">
            {analytics.recurring_violations.map((rv, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                    {rv.violation_type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                    {rv.occurrences} Incidents
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  <strong>Recommended Directive:</strong> {rv.recommended_policy}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-600" /> Statutory Category Compliance Health
          </h3>
          <p className="text-xs text-gray-500">
            Sector-wide score distribution against DGMS statutory benchmarks
          </p>

          <div className="space-y-4 pt-2">
            {Object.entries(analytics.compliance_breakdown).map(([category, score]) => (
              <div key={category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">{category}</span>
                  <span className={score > 80 ? 'text-green-600' : score > 60 ? 'text-yellow-600' : 'text-red-600'}>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
