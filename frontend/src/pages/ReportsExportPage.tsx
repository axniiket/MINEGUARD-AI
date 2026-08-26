import React, { useEffect, useState } from 'react';
import { getMines, getExportCsvUrl } from '@/api/client';
import { Mine } from '@/types';
import { Download, FileSpreadsheet, FileCheck, ShieldAlert, Calendar, ClipboardCheck, ArrowDownToLine } from 'lucide-react';

export default function ReportsExportPage() {
  const [mines, setMines] = useState<Mine[]>([]);
  const [selectedMine, setSelectedMine] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMines()
      .then((data) => {
        setMines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDownload = (reportType: string) => {
    const url = getExportCsvUrl(selectedMine || undefined, reportType);
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-600" size={28} /> Statutory Compliance Reports & CSV Export
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and download structured CSV datasets for DGMS compliance filings, internal safety audits, and statutory returns
        </p>
      </div>

      {/* Scope Selector */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Export Scope / Target Mine</h3>
          <p className="text-xs text-gray-500">Filter export records for a specific mine site or all national leaseholds</p>
        </div>

        <select
          value={selectedMine}
          onChange={(e) => setSelectedMine(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-gray-800"
        >
          <option value="">All Mines Combined ({mines.length} Sites)</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.location})
            </option>
          ))}
        </select>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Inspections Report */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600">
              <ClipboardCheck size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Field Safety & Compliance Audits</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Complete audit ledger including inspection titles, GPS coordinates, timestamps, AI risk scores, severity classifications, and digitized OCR status.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase">
              <span>Includes: Geotags</span> &bull; <span>OCR Metadata</span> &bull; <span>AI Scores</span>
            </div>
          </div>

          <button
            onClick={() => handleDownload('inspections')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowDownToLine size={15} /> Download Inspections CSV
          </button>
        </div>

        {/* 2. Corrective Actions Report */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-indigo-50 text-indigo-600">
              <FileCheck size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Corrective Actions & Closure Evidence</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Action items register including assigned personnel, statutory deadlines, escalation flags, resolution notes, and verified closure evidence.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase">
              <span>Includes: Escalation Log</span> &bull; <span>Evidence Text</span>
            </div>
          </div>

          <button
            onClick={() => handleDownload('actions')}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowDownToLine size={15} /> Download Corrective Actions CSV
          </button>
        </div>

        {/* 3. Alerts & Hazard Register */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Risk Alerts & Hazard Incident Log</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Historical log of critical methane anomalies, roof support warnings, equipment failures, resolution timestamps, and severity classifications.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase">
              <span>Includes: Severity</span> &bull; <span>Methane Alerts</span> &bull; <span>Status</span>
            </div>
          </div>

          <button
            onClick={() => handleDownload('alerts')}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowDownToLine size={15} /> Download Alerts CSV
          </button>
        </div>

        {/* 4. Compliance Calendar Report */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-green-50 text-green-600">
              <Calendar size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Statutory Compliance Calendar Milestones</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              DGMS, MOEFCC, and CPCB regulatory deadlines, regulation codes, responsible officers, due dates, and completion status.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase">
              <span>Includes: DGMS Codes</span> &bull; <span>Statutory Deadlines</span>
            </div>
          </div>

          <button
            onClick={() => handleDownload('compliance')}
            className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowDownToLine size={15} /> Download Compliance Calendar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
