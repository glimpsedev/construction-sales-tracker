import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import JobPin from "./JobPin";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Job } from "@shared/schema";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { getMergedFilterPreferences } from "@/lib/utils";

// Extend Leaflet Map type to include our custom property
declare module 'leaflet' {
  interface Map {
    _userHasInteracted?: boolean;
  }
}

// Fix for default markers in Leaflet
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

  // Merge user preferences with defaults - using shared utility for consistency
  const filterPreferences = useMemo(() => {
    return getMergedFilterPreferences(preferences);
  }, [preferences]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map centered on California (adjusted for better view)
    const map = L.map(mapRef.current, {
      center: [37.5, -119.5], // California center - adjusted north for better coverage
      zoom: 6,
      zoomControl: false
    });
    
    // Track user interaction to prevent automatic recentering
    map.on('dragstart zoomstart', () => {
      map._userHasInteracted = true;
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapLoaded(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when jobs change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();

    // Add new markers - filter out jobs outside California
    jobs.forEach(job => {
      if (job.latitude && job.longitude) {
        const lat = parseFloat(job.latitude);
        const lng = parseFloat(job.longitude);

        if (isNaN(lat) || isNaN(lng)) return;
        
        // Filter out jobs outside California bounds
        // California roughly: lat 32.5 to 42, lng -124.5 to -114
        if (lat < 32.5 || lat > 42 || lng < -124.5 || lng > -114) {
          console.log(`Skipping job outside California: ${job.name} at ${lat}, ${lng}`);
          return;
        }

        // Get color from filter preferences based on temperature
        // Offices get a distinct color (cyan/teal)
        let pinColor = '#3b82f6'; // Default blue
        if (job.type === 'office') {
          pinColor = '#0891b2'; // Cyan-600 for offices
        } else if (job.temperature && filterPreferences[job.temperature]) {
          pinColor = filterPreferences[job.temperature].color;
        } else if (job.isCold && filterPreferences.cold) {
          pinColor = filterPreferences.cold.color;
        }
        
        const effectiveStatus = getEffectiveStatus(job);
        const iconHtml = getStatusIcon(effectiveStatus, job.type);
        const markerContent = getMarkerContent(job, iconHtml);
        
        const customIcon = L.divIcon({
          html: `
            <div class="relative">
              <div class="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center pin-drop" style="background-color: ${pinColor};">
                ${markerContent}
              </div>
            </div>
          `,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => onJobSelect(job));

        // Add tooltip
        const value = job.projectValue ? `$${parseFloat(job.projectValue).toLocaleString()}` : '';
        marker.bindTooltip(`${job.name}${value ? ` - ${value}` : ''}`, {
          direction: 'top',
          offset: [0, -5]
        });

        markers.set(job.id, marker);
      }
    });

    // Fit bounds only on initial load - filter California jobs only
    const validJobs = jobs.filter(job => {
      if (!job.latitude || !job.longitude) return false;
      const lat = parseFloat(job.latitude);
      const lng = parseFloat(job.longitude);
      // Only include California jobs
      return !isNaN(lat) && !isNaN(lng) && 
             lat >= 32.5 && lat <= 42 && 
             lng >= -124.5 && lng <= -114;
    });
    
    // Only fit bounds if this is the first load (no user interaction yet)
    if (validJobs.length > 0 && !mapInstanceRef.current._userHasInteracted) {
      const bounds = L.latLngBounds(
        validJobs.map(job => [parseFloat(job.latitude!), parseFloat(job.longitude!)])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [jobs, mapLoaded, onJobSelect, filterPreferences]);

  // Highlight selected job without moving the map
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedJob) return;

    const marker = markersRef.current.get(selectedJob.id);
    if (marker && selectedJob.latitude && selectedJob.longitude) {
      // Just highlight the marker, don't move the map
      // You could add visual feedback here if needed
    }
  }, [selectedJob]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleLocateMe = async () => {
    await getCurrentLocation();
    if (location && mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lng], 13);
      
      // Add user location marker if it doesn't exist
      const userMarker = L.marker([location.lat, location.lng], {
        icon: L.divIcon({
          html: '<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>',
          className: 'user-location-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(mapInstanceRef.current);

      userMarker.bindTooltip('Your Location', { direction: 'top' });
    }
  };

  const handleToggleLayers = () => {
    // Could implement different map layers (satellite, terrain, etc.)
    console.log('Toggle layers - feature could be implemented');
  };

  // Determine the effective status based on target start date
  const getEffectiveStatus = (job: Job) => {
    if (job.status === 'completed') return 'completed'; // Don't change completed status
    
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      // If start date has passed and job is in planning, mark as active
      if (startDate <= today && job.status === 'planning') {
        return 'active';
      }
    }
    
    return job.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary';
      case 'completed': return 'bg-secondary';
      case 'planning': return 'bg-accent';
      case 'pending': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string, type: string) => {
    if (type === 'equipment') return 'fas fa-cog';
    if (type === 'office') return 'fas fa-building-columns'; // Office icon
    
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
    const diffMs = today.getTime() - visitDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // For visited jobs: show days since last visit. For never-visited: show status icon.
  const getMarkerContent = (job: Job, iconHtml: string): string => {
    if (job.type === 'equipment' || job.type === 'office') {
      return `<i class="${iconHtml} text-white text-xs"></i>`;
    }
    if (job.visited && job.temperatureSetAt) {
      const days = getDaysSinceVisit(job.temperatureSetAt);
      return `<span class="text-white text-xs font-semibold leading-none">${days}</span>`;
    }
    return `<i class="${iconHtml} text-white text-xs"></i>`;
  };

  return (
    <div className="relative h-full w-full" data-testid="interactive-map">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="h-full w-full map-container"
        data-testid="map-container"
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Button
          variant="secondary"
          size="icon"
          className="bg-white shadow-md hover:shadow-lg border border-gray-200"
          onClick={handleZoomIn}
          data-testid="button-zoom-in"
        >
          <i className="fas fa-plus text-darktext"></i>
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="bg-white shadow-md hover:shadow-lg border border-gray-200"
          onClick={handleZoomOut}
          data-testid="button-zoom-out"
        >
          <i className="fas fa-minus text-darktext"></i>
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="bg-white shadow-md hover:shadow-lg border border-gray-200"
          onClick={handleLocateMe}
          data-testid="button-locate-me"
        >
          <i className="fas fa-crosshairs text-darktext"></i>
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="bg-white shadow-md hover:shadow-lg border border-gray-200"
          onClick={handleToggleLayers}
          data-testid="button-toggle-layers"
        >
          <i className="fas fa-layer-group text-darktext"></i>
        </Button>
      </div>

      {/* Mobile Filter Toggle */}
      <Button
        variant="secondary"
        size="icon"
        className="sm:hidden absolute top-4 left-4 z-10 bg-white shadow-md"
        onClick={() => {}} // This would be handled by parent
        data-testid="button-mobile-filter"
      >
        <i className="fas fa-filter text-darktext"></i>
      </Button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-md border border-gray-200" data-testid="map-legend">
        <h4 className="text-sm font-medium text-darktext mb-3">Job Status</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            <span className="text-xs">Active Jobs</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span className="text-xs">Cold Jobs</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-xs">Hot Jobs</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-xs">Warm Jobs</span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading jobs...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Color functions for job status
function getDefaultStatusColor(): string {
  return "bg-blue-600"; // Default blue for jobs
}
