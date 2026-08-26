import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { getMines, getInspections, getAlerts } from '@/api/client';
import { Mine, Inspection, Alert } from '@/types';
import { MapPin, Layers, ShieldAlert, ClipboardCheck, Mountain, Compass, ChevronRight } from 'lucide-react';

export default function MineMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  const [mines, setMines] = useState<Mine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Layer filters
  const [showMines, setShowMines] = useState(true);
  const [showInspections, setShowInspections] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'mine' | 'inspection' | 'alert';
    data: any;
  } | null>(null);

  useEffect(() => {
    Promise.all([getMines(), getInspections(), getAlerts('active')])
      .then(([minesData, insData, alertsData]) => {
        setMines(minesData);
        setInspections(insData.filter((i) => i.latitude !== null && i.longitude !== null));
        setAlerts(alertsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || loading) return;

    // Centered over Eastern / Central Indian coal mining belt
    const map = L.map(mapContainerRef.current).setView([22.5, 84.8], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loading]);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // 1. Mine Markers
    if (showMines) {
      mines.forEach((mine) => {
        if (mine.latitude && mine.longitude) {
          const mineIcon = L.divIcon({
            className: 'custom-mine-pin',
            html: `
              <div style="background-color: #15803d; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">
                ⛏️
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });

          const marker = L.marker([mine.latitude, mine.longitude], { icon: mineIcon }).addTo(map);
          marker.on('click', () => {
            setSelectedEntity({ type: 'mine', data: mine });
          });
        }
      });
    }

    // 2. Inspection Markers
    if (showInspections) {
      inspections.forEach((ins) => {
        if (ins.latitude && ins.longitude) {
          const color =
            ins.type === 'safety' ? '#dc2626' : ins.type === 'environment' ? '#16a34a' : '#ca8a04';
          const insIcon = L.divIcon({
            className: 'custom-ins-pin',
            html: `
              <div style="background-color: ${color}; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.25); border: 2px solid white; cursor: pointer;">
                📋
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          const marker = L.marker([ins.latitude, ins.longitude], { icon: insIcon }).addTo(map);
          marker.on('click', () => {
            setSelectedEntity({ type: 'inspection', data: ins });
          });
        }
      });
    }

    // 3. Alert Markers (plotted near mine site with small offset for visibility)
    if (showAlerts) {
      alerts.forEach((alert, idx) => {
        const mine = mines.find((m) => m.id === alert.mine_id);
        if (mine && mine.latitude && mine.longitude) {
          // Slight jitter so multiple alerts don't overlap exactly
          const offsetLat = (idx % 3 === 0 ? 0.008 : idx % 3 === 1 ? -0.008 : 0.004) * (idx + 1);
          const offsetLng = (idx % 2 === 0 ? 0.008 : -0.008) * (idx + 1);

          const alertIcon = L.divIcon({
            className: 'custom-alert-pin',
            html: `
              <div style="background-color: #ef4444; color: white; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 0 10px rgba(239,68,68,0.7); border: 2px solid white; cursor: pointer; animation: pulse 2s infinite;">
                ⚠️
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([mine.latitude + offsetLat, mine.longitude + offsetLng], { icon: alertIcon }).addTo(map);
          marker.on('click', () => {
            setSelectedEntity({ type: 'alert', data: alert });
          });
        }
      });
    }
  }, [mines, inspections, alerts, showMines, showInspections, showAlerts]);

  const getMineName = (id: string) => mines.find((m) => m.id === id)?.name || 'Coal Mine Site';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Compass className="text-green-600" size={28} /> Mine GIS Geospatial Map
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visual coordinates of active mine sites, geo-tagged safety audits, and regional risk alerts
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-xs border border-gray-200">
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={showMines}
              onChange={(e) => setShowMines(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span>⛏️ Mines ({mines.length})</span>
          </label>
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={showInspections}
              onChange={(e) => setShowInspections(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>📍 Audits ({inspections.length})</span>
          </label>
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span>⚠️ Alerts ({alerts.length})</span>
          </label>
        </div>
      </div>

      {/* Map & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-2 h-[540px] bg-gray-100 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center text-sm font-semibold text-gray-600">
              Loading interactive geospatial map...
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Selected Entity Side Panel */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4">
          {selectedEntity ? (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-md">
                  {selectedEntity.type === 'mine'
                    ? 'Coal Mining Leasehold'
                    : selectedEntity.type === 'inspection'
                    ? 'Geo-Tagged Field Audit'
                    : 'Active Risk Alert'}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  {selectedEntity.data.name || selectedEntity.data.title}
                </h3>
              </div>

              {selectedEntity.type === 'mine' && (
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    <strong>Location:</strong> {selectedEntity.data.location}, {selectedEntity.data.state}
                  </p>
                  <p>
                    <strong>Coordinates:</strong> {selectedEntity.data.latitude?.toFixed(4)},{' '}
                    {selectedEntity.data.longitude?.toFixed(4)}
                  </p>
                  <p>
                    <strong>Type:</strong> <span className="capitalize">{selectedEntity.data.mine_type}</span>
                  </p>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Compliance Health</p>
                    <p className="text-2xl font-extrabold text-green-600 mt-0.5">
                      {selectedEntity.data.compliance_score}%
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/mines/${selectedEntity.data.id}`)}
                    className="w-full mt-2 py-2 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Open Mine Dashboard</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {selectedEntity.type === 'inspection' && (
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    <strong>Mine:</strong> {getMineName(selectedEntity.data.mine_id)}
                  </p>
                  <p>
                    <strong>GPS Coordinates:</strong> {selectedEntity.data.latitude?.toFixed(4)},{' '}
                    {selectedEntity.data.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {selectedEntity.data.description}
                  </p>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-900">AI Risk Score</span>
                    <span className="text-lg font-extrabold text-indigo-700">
                      {selectedEntity.data.ai_risk_score ?? 'N/A'}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/inspections/${selectedEntity.data.id}`)}
                    className="w-full mt-2 py-2 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <span>View Full Inspection</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {selectedEntity.type === 'alert' && (
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    <strong>Mine:</strong> {getMineName(selectedEntity.data.mine_id)}
                  </p>
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs">
                    {selectedEntity.data.message}
                  </div>
                  <button
                    onClick={() => navigate('/alerts')}
                    className="w-full mt-2 py-2 px-4 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
                  >
                    View in Alerts Center
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 space-y-2 my-auto">
              <MapPin size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Select a map pin to inspect</p>
              <p className="text-xs text-gray-400">
                Click on any mine (⛏️), audit pin (📋), or alert (⚠️) to view coordinates and metadata.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span>Powered by OpenStreetMap</span>
            <span>WGS84 Datum</span>
          </div>
        </div>
      </div>
    </div>
  );
}
