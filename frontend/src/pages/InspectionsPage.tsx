import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInspections, getMines, createInspection, uploadInspectionDocument } from '@/api/client';
import { Inspection, Mine } from '@/types';
import { Plus, X, Filter, MapPin, Locate, Loader2, AlertCircle, FileText, CheckCircle, Save, WifiOff, Trash2 } from 'lucide-react';

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMineFilter, setSelectedMineFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Form state
  const [mineId, setMineId] = useState('');
  const [type, setType] = useState('safety');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geoStatus, setGeoStatus] = useState<{ loading: boolean; message: string; type: 'idle' | 'success' | 'warning' | 'error' }>({
    loading: false,
    message: '',
    type: 'idle',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('mineguard_inspection_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title || parsed.description || parsed.mineId) {
          setHasDraft(true);
        }
      } catch {
        // Ignore invalid draft
      }
    }
  }, []);

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem('mineguard_inspection_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setMineId(parsed.mineId || '');
        setType(parsed.type || 'safety');
        setTitle(parsed.title || '');
        setDescription(parsed.description || '');
        setLatitude(parsed.latitude || '');
        setLongitude(parsed.longitude || '');
      } catch {
        // Ignore
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('mineguard_inspection_draft');
    setHasDraft(false);
    setMineId('');
    setType('safety');
    setTitle('');
    setDescription('');
    setLatitude('');
    setLongitude('');
  };

  // Auto-save draft whenever user types
  useEffect(() => {
    if (title || description || mineId || latitude || longitude) {
      const draftObj = { mineId, type, title, description, latitude, longitude, savedAt: new Date().toISOString() };
      localStorage.setItem('mineguard_inspection_draft', JSON.stringify(draftObj));
      setHasDraft(true);
    }
  }, [mineId, type, title, description, latitude, longitude]);

  const fetchData = async () => {
    try {
      const [insRes, minesRes] = await Promise.all([getInspections(), getMines()]);
      setInspections(insRes);
      setMines(minesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({
        loading: false,
        message: 'Geolocation is not supported by your browser. Please enter coordinates manually.',
        type: 'warning',
      });
      return;
    }

    setGeoStatus({ loading: true, message: 'Requesting device GPS coordinates...', type: 'idle' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setGeoStatus({
          loading: false,
          message: `GPS Acquired: ${lat}, ${lng} (accuracy: ±${Math.round(position.coords.accuracy)}m)`,
          type: 'success',
        });
      },
      (error) => {
        let msg = 'Could not retrieve GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access denied. You may enter coordinates manually or leave blank.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable. Please enter coordinates manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out. Please enter coordinates manually.';
        }
        setGeoStatus({
          loading: false,
          message: msg,
          type: 'warning',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mineId) {
      setErrorMessage('Please select a mine site.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const parsedLat = latitude.trim() ? parseFloat(latitude) : null;
      const parsedLng = longitude.trim() ? parseFloat(longitude) : null;

      const created = await createInspection({
        mine_id: mineId,
        type,
        title,
        description,
        latitude: isNaN(parsedLat as number) ? null : parsedLat,
        longitude: isNaN(parsedLng as number) ? null : parsedLng,
      });

      // If document was attached during creation, upload it now
      if (selectedFile && created.id) {
        try {
          await uploadInspectionDocument(created.id, selectedFile);
        } catch (uploadErr) {
          console.warn('Document OCR upload failed during creation, inspection saved:', uploadErr);
        }
      }

      // Clear draft on successful submission
      localStorage.removeItem('mineguard_inspection_draft');
      setHasDraft(false);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setMineId('');
      setLatitude('');
      setLongitude('');
      setSelectedFile(null);
      setGeoStatus({ loading: false, message: '', type: 'idle' });
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to create inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInspections = inspections.filter((ins) => {
    if (selectedMineFilter && ins.mine_id !== selectedMineFilter) return false;
    if (selectedTypeFilter && ins.type !== selectedTypeFilter) return false;
    return true;
  });

  const getMineName = (id: string) => {
    const mine = mines.find((m) => m.id === id);
    return mine ? mine.name : 'Coal Mine';
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="p-3.5 bg-amber-500 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff size={18} />
            <span>You are currently working offline. Inspection drafts will be saved locally to your device.</span>
          </div>
          <span className="bg-amber-600/80 px-2 py-0.5 rounded uppercase">Offline Mode</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Field Inspections
          </h1>
          <p className="text-sm text-gray-500">
            Geo-tagged compliance reports, automated OCR document digitization, and offline draft support
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              onClick={() => {
                restoreDraft();
                setIsModalOpen(true);
              }}
              className="bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 px-3.5 py-2.5 rounded-xl font-semibold flex items-center text-xs transition-colors"
            >
              <Save size={15} className="mr-1 text-amber-600" /> Resume Draft
            </button>
          )}
          <button
            onClick={() => {
              setErrorMessage('');
              setIsModalOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center shadow-sm hover:shadow-md transition-all text-sm"
          >
            <Plus size={18} className="mr-1.5" /> New Inspection
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <Filter size={15} className="mr-1.5 text-gray-400" /> Filter:
        </div>

        <select
          value={selectedMineFilter}
          onChange={(e) => setSelectedMineFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
        >
          <option value="">All Mine Sites ({mines.length})</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="safety">Safety Audit</option>
          <option value="environment">Environmental</option>
          <option value="equipment">Equipment Check</option>
        </select>

        {(selectedMineFilter || selectedTypeFilter) && (
          <button
            onClick={() => {
              setSelectedMineFilter('');
              setSelectedTypeFilter('');
            }}
            className="text-xs text-red-600 hover:underline font-semibold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Inspections List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Loading inspection records...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInspections.map((ins) => {
            const hasLocation = ins.latitude !== null && ins.longitude !== null;
            const hasDoc = !!ins.doc_filename;

            return (
              <div
                key={ins.id}
                onClick={() => navigate(`/inspections/${ins.id}`)}
                className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg hover:text-green-700 transition-colors truncate">
                      {ins.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {getMineName(ins.mine_id)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {ins.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        ins.type === 'safety'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : ins.type === 'environment'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {ins.type}
                    </span>

                    {/* Geotag Indicator */}
                    {hasLocation ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <MapPin size={11} className="mr-1" />
                        {ins.latitude?.toFixed(3)}, {ins.longitude?.toFixed(3)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Location Unavailable
                      </span>
                    )}

                    {/* OCR Document Indicator */}
                    {hasDoc && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FileText size={11} className="mr-1" /> OCR Digitized
                      </span>
                    )}

                    {ins.ai_severity && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          ins.ai_severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : ins.ai_severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : ins.ai_severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        AI: {ins.ai_severity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <div className="text-left md:text-right">
                    <p
                      className={`text-xl font-extrabold ${
                        (ins.ai_risk_score ?? 0) > 75
                          ? 'text-red-600'
                          : (ins.ai_risk_score ?? 0) > 50
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {ins.ai_risk_score !== null && ins.ai_risk_score !== undefined
                        ? ins.ai_risk_score.toFixed(1)
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">Risk Score</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(ins.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredInspections.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200">
              No inspections match the current filters.
            </div>
          )}
        </div>
      )}

      {/* New Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-between pr-8 mb-1">
              <h2 className="text-xl font-extrabold text-gray-900">New Field Inspection</h2>
              {hasDraft && (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="text-xs text-red-600 hover:underline flex items-center font-semibold"
                >
                  <Trash2 size={12} className="mr-1" /> Discard Draft
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
              <Save size={12} className="text-green-600" /> Auto-saving draft locally &bull; Timestamp saved on submit
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Mine Site *
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-gray-50 focus:bg-white text-gray-900"
                  value={mineId}
                  onChange={(e) => setMineId(e.target.value)}
                >
                  <option value="">Select target mine...</option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Inspection Type *
                  </label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-gray-50 focus:bg-white text-gray-900"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="safety">Safety Audit</option>
                    <option value="environment">Environmental</option>
                    <option value="equipment">Equipment Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Inspection Title *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Gallery 4 Methane Check"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-gray-50 focus:bg-white text-gray-900"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Findings & Field Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record observations, safety issues, gas levels, or equipment states..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-gray-50 focus:bg-white text-gray-900"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              {/* Geo-tagging Section */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
                    <MapPin size={14} className="mr-1 text-green-600" /> GPS Geotagging
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={geoStatus.loading}
                    className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 border border-green-300 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {geoStatus.loading ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : (
                      <Locate size={12} className="mr-1" />
                    )}
                    Use My Location
                  </button>
                </div>

                {geoStatus.message && (
                  <div
                    className={`text-xs p-2 rounded-lg ${
                      geoStatus.type === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : geoStatus.type === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {geoStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 23.746)"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-green-500"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g. 86.414)"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-green-500"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Leave blank to save as &ldquo;Location Unavailable&rdquo; or click &ldquo;Use My Location&rdquo; to auto-detect.
                </p>
              </div>

              {/* Optional OCR Document Attachment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center">
                  <FileText size={14} className="mr-1 text-indigo-600" /> Attach Document / Permit for OCR (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {selectedFile && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    ✓ Selected: {selectedFile.name} (OCR will run upon submission)
                  </p>
                )}
              </div>

              {/* Actions */}
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
                  className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Saving Inspection...
                    </>
                  ) : (
                    'Submit Inspection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
