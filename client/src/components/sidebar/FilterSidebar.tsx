import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getMergedFilterPreferences } from "@/lib/utils";
import JobCard from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import type { Job } from "@shared/schema";
import CompanyFilter from "./CompanyFilter";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { FilterPreferencesModal } from "./FilterPreferencesModal";

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  jobs: Job[];
  allJobs: Job[];
  filters: {
    status: string[];
    startDate: string;
    minValue: string;
    maxValue: string;
    temperature?: string[];
    hideCold?: boolean;
    county?: string;
    nearMe?: boolean;
    company?: string;
    showUnvisited?: boolean;
    showOffices?: boolean;
  };
  onFilterChange: (filters: any) => void;
  onJobSelect: (job: Job) => void;
  isLoading: boolean;
}

export default function FilterSidebar({ 
  isOpen, 
  onToggle, 
  jobs, 
  allJobs,
  filters, 
  onFilterChange, 
  onJobSelect, 
  isLoading 
}: FilterSidebarProps) {
  const [valueRange, setValueRange] = useState([
    filters.minValue ? parseFloat(filters.minValue) : 100000000,  // Default to $100M+
    filters.maxValue ? parseFloat(filters.maxValue) : 100000000   // Default to $100M+
  ]);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const { preferences } = useFilterPreferences();
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const { toast } = useToast();

  const geocodeOfficesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/geocode-missing?type=office&limit=500', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to geocode offices');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Geocoding Started",
        description: data.message || "Office geocoding completed"
      });
    },
    onError: () => {
      toast({
        title: "Geocoding Failed",
        description: "Unable to geocode office addresses",
        variant: "destructive"
      });
    }
  });

  // Merge user preferences with defaults - using shared utility to ensure synchronization
  // with JobDetailsModal component
  const filterPreferences = useMemo(() => {
    return getMergedFilterPreferences(preferences);
  }, [preferences]);

  // Get unique counties from jobs
  const availableCounties = useMemo(() => {
    const counties = new Set<string>();
    jobs.forEach(job => {
      if (job.county) {
        counties.add(job.county);
      }
    });
    return Array.from(counties).sort();
  }, [jobs]);

  // Get unique companies from jobs (using contractor field - General Contractor/GC)
  const availableCompanies = useMemo(() => {
    const companies = new Set<string>();
    jobs.forEach(job => {
      if (job.contractor && job.contractor.trim()) {
        companies.add(job.contractor.trim());
      }
    });
    return Array.from(companies).sort();
  }, [jobs]);

  // Helper function to determine effective status
  const getEffectiveStatus = (job: Job) => {
    if (job.status === 'completed') return 'completed';
    
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate <= today && job.status === 'planning') {
        return 'active';
      }
    }
    
    return job.status;
  };

  const stats = useMemo(() => {
    // Total Jobs: count of all jobs in the database
    const total = allJobs.length;
    
    // Jobs Visible: count of jobs that match current filters
    const visible = jobs.length;
    
    // Jobs Visited: count of all jobs that have been visited
    const visited = allJobs.filter(job => job.visited).length;
    
    // Jobs Unvisited: count of all jobs that haven't been visited
    const unvisited = allJobs.filter(job => !job.visited).length;
    const offices = allJobs.filter(job => job.type === 'office').length;
    
    // Calculate status counts based on effective status (for filter display)
    const statusCounts = jobs.reduce((acc, job) => {
      const effectiveStatus = getEffectiveStatus(job);
      acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const active = statusCounts['active'] || 0;
    const planning = statusCounts['planning'] || 0;

    return {
      total,
      visible,
      active,
      planning,
      visited,
      unvisited,
      offices
    };
  }, [jobs, allJobs]);

  const favoriteJobs = useMemo(() => {
    return [...jobs]
      .filter(job => job.isFavorite)
      .sort((a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime());
  }, [jobs]);

  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked 
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    handleFilterChange('status', newStatus);
  };



  const handleValueRangeChange = (value: number[]) => {
    setValueRange(value);
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    // Set new timer for debounced update
    debounceTimer.current = setTimeout(() => {
      onFilterChange({
        ...filters,
        minValue: value[0].toString(),
        maxValue: value[1].toString()
      });
    }, 300);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const formatValue = (value: number) => {
    // Show "$100M+" when at maximum value
    if (value >= 100000000) return `$100M+`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const temperatureKeys = useMemo(() => Object.keys(filterPreferences), [filterPreferences]);
  const selectedTemperatures = filters.temperature ?? temperatureKeys;


  // Initialize temperature filters to "all selected" once preferences load.
  // Do not overwrite explicit user selections (including empty array).
  useEffect(() => {
    if (filters.temperature === undefined && temperatureKeys.length > 0) {
      handleFilterChange('temperature', temperatureKeys);
    }
  }, [filters.temperature, temperatureKeys]);


  return (
    <aside 
      className="w-full h-full bg-white overflow-y-auto"
      data-testid="filter-sidebar"
    >
      <div className="px-6 pb-6 pt-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-darktext">Filters & Jobs</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
            data-testid="button-close-sidebar"
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.total}
            </div>
            <div className="text-sm text-blue-600">Total Jobs</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600" data-testid="stat-visible-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.visible}
            </div>
            <div className="text-sm text-purple-600">Jobs Visible</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-secondary" data-testid="stat-visited-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.visited}
            </div>
            <div className="text-sm text-green-600">Jobs Visited</div>
          </div>
        </div>

        {/* Filter Sections */}
        <div className="space-y-6">
          {/* Location Filters */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Location</h3>
            <div className="space-y-3">
              {/* County Selector */}
              <Select
                value={filters.county || "all"}
                onValueChange={(value) => handleFilterChange('county', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {availableCounties.map(county => (
                    <SelectItem key={county} value={county}>
                      {county}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Company Filter */}
          <CompanyFilter
            companies={availableCompanies}
            value={filters.company || ""}
            onChange={(company) => handleFilterChange('company', company)}
          />

          {/* Project Value Filter */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Project Value</h3>
            <div className="space-y-3">
              <Slider
                value={valueRange}
                onValueChange={handleValueRangeChange}
                min={0}
                max={100000000}
                step={100000}
                className="w-full"
                data-testid="slider-value-range"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatValue(valueRange[0])}</span>
                <span className="text-gray-400">—</span>
                <span>{formatValue(valueRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-active"
                    checked={filters.status.includes('active')}
                    onCheckedChange={(checked) => handleStatusChange('active', !!checked)}
                    data-testid="checkbox-status-active"
                  />
                  <label htmlFor="status-active" className="text-sm cursor-pointer">Active Jobs</label>
                </div>
                <span className="text-xs text-gray-500" data-testid="count-active">{stats.active}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-planning"
                    checked={filters.status.includes('planning')}
                    onCheckedChange={(checked) => handleStatusChange('planning', !!checked)}
                    data-testid="checkbox-status-planning"
                  />
                  <label htmlFor="status-planning" className="text-sm cursor-pointer">Planning</label>
                </div>
                <span className="text-xs text-gray-500" data-testid="count-planning">{stats.planning}</span>
              </div>
            </div>
          </div>


          {/* Start Date */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Start Date</h3>
            <div className="space-y-3">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                data-testid="input-start-date"
              />
            </div>
          </div>

          {/* Temperature Visibility */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-darktext">Temperature Visibility</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferencesModal(true)}
                className="h-7 px-2 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
            <div className="space-y-2">
              {/* Unvisited Jobs - at the top */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-unvisited"
                    checked={!!filters.showUnvisited}
                    onCheckedChange={(checked) => {
                      handleFilterChange('showUnvisited', !!checked);
                    }}
                  />
                  <label htmlFor="show-unvisited" className="text-sm cursor-pointer flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: '#3b82f6' }}
                      aria-label="Unvisited Jobs color"
                    />
                    Unvisited Jobs
                  </label>
                </div>
                <span className="text-xs text-gray-500">{stats.unvisited} unvisited</span>
              </div>

              {/* Offices visibility */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-offices"
                    checked={filters.showOffices !== false}
                    onCheckedChange={(checked) => {
                      handleFilterChange('showOffices', !!checked);
                    }}
                  />
                  <label htmlFor="show-offices" className="text-sm cursor-pointer flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: '#0891b2' }}
                      aria-label="Offices color"
                    />
                    Offices
                  </label>
                </div>
                <span className="text-xs text-gray-500">{stats.offices} offices</span>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => geocodeOfficesMutation.mutate()}
                  disabled={geocodeOfficesMutation.isPending}
                >
                  {geocodeOfficesMutation.isPending ? "Geocoding..." : "Geocode Offices"}
                </Button>
              </div>
              
              {/* Temperature filters */}
              {Object.entries(filterPreferences).map(([key, filter]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`temp-${key}`}
                      checked={selectedTemperatures.includes(key)}
                      onCheckedChange={(checked) => {
                        const nextTemperatures = checked
                          ? Array.from(new Set([...selectedTemperatures, key]))
                          : selectedTemperatures.filter((t: string) => t !== key);
                        handleFilterChange('temperature', nextTemperatures);
                      }}
                    />
                    <label htmlFor={`temp-${key}`} className="text-sm cursor-pointer flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: filter.color }}
                        aria-label={`${filter.name} color`}
                      />
                      {filter.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* Favorites List */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-darktext mb-4">Favorites</h3>
          <div className="space-y-3" data-testid="favorites-list">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              ))
            ) : (
              favoriteJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobSelect(job)}
                />
              ))
            )}
            
            {!isLoading && favoriteJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-star text-2xl mb-2 block"></i>
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs text-gray-400 mt-1">Click the star icon on a job to add it to favorites</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Preferences Modal */}
      <FilterPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </aside>
  );
}
