'use client';

import { useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';

function fixLeafletIcons(L: typeof import('leaflet')) {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

const DEFAULT_IN = { lat: 20.5937, lng: 78.9629 };

export interface ProjectGeoMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat: number | null;
  initialLng: number | null;
  radiusM: number;
  isDark: boolean;
  onApply: (lat: number, lng: number) => void;
}

export default function ProjectGeoMapPicker({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  radiusM,
  isDark,
  onApply,
}: ProjectGeoMapPickerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const circleRef = useRef<import('leaflet').Circle | null>(null);

  useEffect(() => {
    if (!isOpen || !mapElRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !mapElRef.current) return;

      fixLeafletIcons(L);

      const lat0 =
        initialLat != null && Number.isFinite(Number(initialLat)) ? Number(initialLat) : DEFAULT_IN.lat;
      const lng0 =
        initialLng != null && Number.isFinite(Number(initialLng)) ? Number(initialLng) : DEFAULT_IN.lng;

      const map = L.map(mapElRef.current, { zoomControl: true }).setView([lat0, lng0], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([lat0, lng0], { draggable: true }).addTo(map);
      const circle = L.circle([lat0, lng0], {
        radius: Math.max(1, radiusM),
        color: '#6B8E23',
        weight: 2,
        fillColor: '#6B8E23',
        fillOpacity: 0.12,
      }).addTo(map);

      const sync = (ll: import('leaflet').LatLng) => {
        marker.setLatLng(ll);
        circle.setLatLng(ll);
      };

      marker.on('dragend', () => {
        sync(marker.getLatLng());
      });

      map.on('click', (e) => {
        sync(e.latlng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  useEffect(() => {
    if (!isOpen || !circleRef.current) return;
    circleRef.current.setRadius(Math.max(1, radiusM));
  }, [isOpen, radiusM]);

  if (!isOpen) return null;

  const cardClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';

  const handleApply = () => {
    const m = markerRef.current;
    if (!m) return;
    const ll = m.getLatLng();
    onApply(ll.lat, ll.lng);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60">
      <div className={`w-full max-w-3xl rounded-2xl border shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${cardClass}`}>
        <div
          className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
            isDark ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-[#6B8E23] shrink-0" />
            <div className="min-w-0">
              <p className={`font-bold ${textPrimary}`}>Choose from map</p>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Click the map or drag the pin. Circle shows geo-fence radius (~{radiusM} m).
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={mapElRef} className="h-[min(360px,50vh)] w-full min-h-[240px] z-0 leaflet-container" />
        <div
          className={`flex flex-wrap justify-end gap-2 px-4 py-3 border-t shrink-0 ${
            isDark ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border font-bold text-sm ${
              isDark ? 'border-slate-600 text-slate-200' : 'border-slate-300 text-slate-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-[#6B8E23] hover:bg-[#5a7a1e] text-white font-bold text-sm"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}
