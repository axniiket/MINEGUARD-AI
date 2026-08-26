import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInspection, getMines, uploadInspectionDocument } from '@/api/client';
import { Inspection, Mine } from '@/types';
import {
  ArrowLeft,
  Brain,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Upload,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  FileSearch,
  ExternalLink,
} from 'lucide-react';

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OCR Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [insData, minesData] = await Promise.all([getInspection(id), getMines()]);
      setInspection(insData);
      setMines(minesData);
    } catch (err) {
      console.error(err);
      setError('Could not load inspection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !id) return;
    setUploading(true);
    setUploadError('');
    try {
      const updated = await uploadInspectionDocument(id, uploadFile);
      setInspection(updated);
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Document upload and OCR failed. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-40 bg-gray-200 rounded-2xl"></div>
        <div className="h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm">
          {error || 'Inspection report not found.'}
        </div>
        <button
          onClick={() => navigate('/inspections')}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800"
        >
          Return to Inspections
        </button>
      </div>
    );
  }

  const parseRecommendedActions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return (raw as unknown[]).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).filter(Boolean);
          }
          if (typeof parsed === 'object' && parsed !== null) {
            return Object.values(parsed).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).filter(Boolean);
          }
        } catch {
          // Fall through
        }
      }
      return trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^\s*(?:\d+[\.\)]|\-|\*)\s*/, ''));
    }
    return [String(raw)];
  };

  const recommendedActions = parseRecommendedActions(inspection.ai_recommended_actions);
  const mine = mines.find((m) => m.id === inspection.mine_id);
  const hasCoordinates = inspection.latitude !== null && inspection.longitude !== null;
  const isImageDoc = inspection.doc_filename && /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(inspection.doc_filename);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/inspections')}
        className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1.5" /> Back to Inspections
      </button>

      {/* Main Report Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-md">
              {mine ? mine.name : 'Coal Mine Site'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mt-2">
              {inspection.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                inspection.type === 'safety'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : inspection.type === 'environment'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}
            >
              {inspection.type}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {inspection.status}
            </span>
          </div>
        </div>

        {/* Metadata Grid with Geotag & Timestamp */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm bg-gray-50/80 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center text-gray-600">
            <Calendar size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Submission Time</p>
              <p className="font-semibold text-gray-800">
                {new Date(inspection.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center text-gray-600">
            <User size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Inspector ID</p>
              <p className="font-semibold text-gray-800 truncate">
                #{inspection.inspector_id ? inspection.inspector_id.substring(0, 8) : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center text-gray-600">
            <MapPin size={16} className="mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Geolocation</p>
              {hasCoordinates ? (
                <p className="font-semibold text-emerald-700">
                  {inspection.latitude?.toFixed(4)}, {inspection.longitude?.toFixed(4)}
                </p>
              ) : (
                <p className="font-medium text-gray-400 italic">Location Unavailable</p>
              )}
            </div>
          </div>
        </div>

        {/* Observations Description */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
            <FileText size={15} /> Field Observations & Audit Notes
          </h3>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
            {inspection.description}
          </div>
        </div>
      </div>

      {/* OCR Document Digitization Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileSearch size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">OCR Document Digitization</h2>
              <p className="text-xs text-gray-500">
                Local Tesseract OCR text extraction for compliance permits and certificates
              </p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleDocumentUpload} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="flex-1 text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer"
            />
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" /> Running OCR...
                </>
              ) : (
                <>
                  <Upload size={14} className="mr-1.5" /> Upload & Digitize
                </>
              )}
            </button>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {uploadError}
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Supported formats: PNG, JPG, JPEG, WEBP, and PDF documents. Processed using local Tesseract engine.
          </p>
        </form>

        {/* Extracted Document Display */}
        {inspection.doc_filename ? (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-indigo-600 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-900 truncate">
                  {inspection.doc_filename}
                </span>
                {inspection.doc_uploaded_at && (
                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                    &bull; Uploaded {new Date(inspection.doc_uploaded_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    inspection.doc_extraction_status === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspection.doc_extraction_status === 'no_text_found'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {inspection.doc_extraction_status === 'success'
                    ? 'OCR Complete'
                    : inspection.doc_extraction_status === 'no_text_found'
                    ? 'No Text Layer'
                    : 'Extraction Failed'}
                </span>

                {inspection.doc_file_url && (
                  <a
                    href={`http://localhost:8000${inspection.doc_file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-2 py-1 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-50"
                  >
                    <ExternalLink size={12} className="mr-1" /> View File
                  </a>
                )}
              </div>
            </div>

            {/* Image Preview if available */}
            {isImageDoc && inspection.doc_file_url && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 self-start">
                  Document Preview
                </p>
                <img
                  src={`http://localhost:8000${inspection.doc_file_url}`}
                  alt="Inspection Document"
                  className="max-h-64 object-contain rounded-lg border border-gray-200 shadow-xs"
                />
              </div>
            )}

            {/* Extracted Text Content */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Extracted Digital Text
                </h4>
                {inspection.doc_extracted_text && (
                  <button
                    onClick={() => handleCopyText(inspection.doc_extracted_text || '')}
                    className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="mr-1 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="mr-1" /> Copy Text
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto border border-gray-800 shadow-inner">
                {inspection.doc_extracted_text || 'No text extracted.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-500">
            No compliance document or certificate attached yet. Upload an image or PDF to extract and digitize its content.
          </div>
        )}
      </div>

      {/* AI Governance & Risk Assessment Card */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 rounded-2xl shadow-xs border border-indigo-100/90 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
          <div className="flex items-center text-indigo-950 font-extrabold text-lg gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Brain size={20} />
            </div>
            <span>AI Governance & Risk Assessment</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full">
            DGMS Compliant Model
          </span>
        </div>

        {inspection.ai_risk_score !== undefined && inspection.ai_risk_score !== null ? (
          <div className="space-y-6">
            {/* Risk Metric Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Calculated Risk Score
                  </p>
                  <p
                    className={`text-3xl sm:text-4xl font-extrabold mt-1 ${
                      inspection.ai_risk_score > 75
                        ? 'text-red-600'
                        : inspection.ai_risk_score > 50
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}
                  >
                    {inspection.ai_risk_score.toFixed(1)}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    inspection.ai_risk_score > 75
                      ? 'bg-red-50 text-red-600'
                      : inspection.ai_risk_score > 50
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  <ShieldAlert size={28} />
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-center space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Predicted Category & Severity
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800">
                    {inspection.ai_category || 'General'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      inspection.ai_severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : inspection.ai_severity === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : inspection.ai_severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    Severity: {inspection.ai_severity || 'Low'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Corrective Actions List */}
            {recommendedActions.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-xs space-y-3">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-green-600" /> Recommended Corrective Actions
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {recommendedActions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50/70 border border-gray-100"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="leading-snug pt-0.5">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-white/70 rounded-xl border border-indigo-100 text-center text-sm text-indigo-700 italic">
            Automated AI analysis pending for this submission.
          </div>
        )}
      </div>
    </div>
  );
}
