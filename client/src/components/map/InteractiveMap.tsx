import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Job } from "@shared/schema";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { getMergedFilterPreferences } from "@/lib/utils";
import { Plus, Minus, Crosshair, Layers } from "lucide-react";

declare module 'leaflet' {
  interface Map {
    _userHasInteracted?: boolean;
  }
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface InteractiveMapProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job) => void;
  isLoading: boolean;
}

export default function InteractiveMap({ jobs, selectedJob, onJobSelect, isLoading }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const { location, getCurrentLocation } = useGeolocation();
  const { preferences } = useFilterPreferences();

  const filterPreferences = useMemo(() => getMergedFilterPreferences(preferences), [preferences]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [37.5, -119.5],
      zoom: 6,
      zoomControl: false
    });
    map.on('dragstart zoomstart', () => { map._userHasInteracted = true; });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    mapInstanceRef.current = map;
    setMapLoaded(true);
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();

    jobs.forEach(job => {
      if (job.latitude && job.longitude) {
        const lat = parseFloat(job.latitude);
        const lng = parseFloat(job.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        if (lat < 32.5 || lat > 42 || lng < -124.5 || lng > -114) return;

        let pinColor = '#3b82f6';
        if (job.type === 'office') {
          pinColor = '#0891b2';
        } else if (job.temperature && filterPreferences[job.temperature]) {
          pinColor = filterPreferences[job.temperature].color;
        } else if (job.isCold && filterPreferences.cold) {
          pinColor = filterPreferences.cold.color;
        }

        const effectiveStatus = getEffectiveStatus(job);
        const iconHtml = getStatusIcon(effectiveStatus, job.type);
        const markerContent = getMarkerContent(job, iconHtml);

        const customIcon = L.divIcon({
          html: `<div class="relative"><div class="w-8 h-8 rounded-full border-[3px] border-white shadow-md flex items-center justify-center pin-drop" style="background-color: ${pinColor};">${markerContent}</div></div>`,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => onJobSelect(job));

        const value = job.projectValue ? `$${parseFloat(job.projectValue).toLocaleString()}` : '';
        marker.bindTooltip(`${job.name}${value ? ` - ${value}` : ''}`, { direction: 'top', offset: [0, -5] });
        markers.set(job.id, marker);
      }
    });

    const validJobs = jobs.filter(job => {
      if (!job.latitude || !job.longitude) return false;
      const lat = parseFloat(job.latitude);
      const lng = parseFloat(job.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat >= 32.5 && lat <= 42 && lng >= -124.5 && lng <= -114;
    });

    if (validJobs.length > 0 && !mapInstanceRef.current._userHasInteracted) {
      const bounds = L.latLngBounds(validJobs.map(job => [parseFloat(job.latitude!), parseFloat(job.longitude!)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [jobs, mapLoaded, onJobSelect, filterPreferences]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedJob) return;
  }, [selectedJob]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleLocateMe = async () => {
    await getCurrentLocation();
    if (location && mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lng], 13);
      L.marker([location.lat, location.lng], {
        icon: L.divIcon({
          html: '<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
          className: 'user-location-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(mapInstanceRef.current).bindTooltip('Your Location', { direction: 'top' });
    }
  };

  const getEffectiveStatus = (job: Job) => {
    if (job.status === 'completed') return 'completed';
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      if (startDate <= today && job.status === 'planning') return 'active';
    }
    return job.status;
  };

  const getStatusIcon = (status: string, type: string) => {
    if (type === 'equipment') return 'fas fa-cog';
    if (type === 'office') return 'fas fa-building-columns';
    switch (status) {
      case 'active': return 'fas fa-hammer';
      case 'completed': return 'fas fa-check';
      case 'planning': return 'fas fa-clock';
      case 'pending': return 'fas fa-pause';
      default: return 'fas fa-map-marker-alt';
    }
  };

  const getDaysSinceVisit = (date: Date | string): number => {
    const visitDate = new Date(date);
    visitDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMarkerContent = (job: Job, iconHtml: string): string => {
    if (job.type === 'equipment' || job.type === 'office') return `<i class="${iconHtml} text-white text-xs"></i>`;
    if (job.visited && job.temperatureSetAt) {
      const days = getDaysSinceVisit(job.temperatureSetAt);
      return `<span class="text-white text-xs font-semibold leading-none">${days}</span>`;
    }
    return `<i class="${iconHtml} text-white text-xs"></i>`;
  };

  return (
    <div className="relative h-full w-full" data-testid="interactive-map">
      <div ref={mapRef} className="h-full w-full map-container" data-testid="map-container" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        {[
          { icon: Plus, handler: handleZoomIn, label: "Zoom in" },
          { icon: Minus, handler: handleZoomOut, label: "Zoom out" },
          { icon: Crosshair, handler: handleLocateMe, label: "My location" },
        ].map(({ icon: Icon, handler, label }) => (
          <button
            key={label}
            onClick={handler}
            title={label}
            className="h-9 w-9 bg-white rounded-lg shadow-md border border-gray-200/60 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-md border border-gray-200/60" data-testid="map-legend">
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Legend</h4>
        <div className="space-y-1.5">
          {[
            { color: "#3b82f6", label: "Active / Unvisited" },
            { color: "#ef4444", label: "Hot" },
            { color: "#f97316", label: "Warm" },
            { color: "#6b7280", label: "Cold" },
            { color: "#22c55e", label: "Green" },
            { color: "#0891b2", label: "Offices" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Loading jobs...</p>
          </div>
        </div>
      )}
    </div>
  );
}
