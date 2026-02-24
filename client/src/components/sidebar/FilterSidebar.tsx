import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getMergedFilterPreferences } from "@/lib/utils";
import JobCard from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, X, Star, ChevronDown, ChevronRight } from "lucide-react";
import type { Job } from "@shared/schema";
import CompanyFilter from "./CompanyFilter";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { FilterPreferencesModal } from "./FilterPreferencesModal";

interface GlobalStats {
  totalJobs: number;
  visitedJobs: number;
  unvisitedJobs: number;
  officeJobs: number;
  activeJobs: number;
  planningJobs: number;
  completedJobs: number;
  totalValue: number;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  jobs: Job[];
  globalStats?: GlobalStats;
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

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export default function FilterSidebar({
  isOpen,
  onToggle,
  jobs,
  globalStats,
  filters,
  onFilterChange,
  onJobSelect,
  isLoading
}: FilterSidebarProps) {
  const [valueRange, setValueRange] = useState([
    filters.minValue ? parseFloat(filters.minValue) : 100000000,
    filters.maxValue ? parseFloat(filters.maxValue) : 100000000
  ]);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const { preferences } = useFilterPreferences();
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(true);

  const filterPreferences = useMemo(() => getMergedFilterPreferences(preferences), [preferences]);

  const availableCounties = useMemo(() => {
    const counties = new Set<string>();
    jobs.forEach(job => { if (job.county) counties.add(job.county); });
    return Array.from(counties).sort();
  }, [jobs]);

  const availableCompanies = useMemo(() => {
    const companies = new Set<string>();
    jobs.forEach(job => { if (job.contractor?.trim()) companies.add(job.contractor.trim()); });
    return Array.from(companies).sort();
  }, [jobs]);

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

  const stats = useMemo(() => {
    const total = globalStats?.totalJobs ?? 0;
    const visible = jobs.length;
    const visited = globalStats?.visitedJobs ?? 0;
    const unvisited = globalStats?.unvisitedJobs ?? 0;
    const offices = globalStats?.officeJobs ?? 0;
    const statusCounts = jobs.reduce((acc, job) => {
      const effectiveStatus = getEffectiveStatus(job);
      acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, visible, active: statusCounts['active'] || 0, planning: statusCounts['planning'] || 0, visited, unvisited, offices };
  }, [jobs, globalStats]);

  const favoriteJobs = useMemo(() => {
    return [...jobs]
      .filter(job => job.isFavorite)
      .sort((a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime());
  }, [jobs]);

  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    handleFilterChange('status', newStatus);
  };

  const handleValueRangeChange = (value: number[]) => {
    setValueRange(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onFilterChange({ ...filters, minValue: value[0].toString(), maxValue: value[1].toString() });
    }, 300);
  };

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const formatValue = (value: number) => {
    if (value >= 100000000) return `$100M+`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const temperatureKeys = useMemo(() => Object.keys(filterPreferences), [filterPreferences]);
  const selectedTemperatures = filters.temperature ?? temperatureKeys;

  useEffect(() => {
    if (filters.temperature === undefined && temperatureKeys.length > 0) {
      handleFilterChange('temperature', temperatureKeys);
    }
  }, [filters.temperature, temperatureKeys]);

  return (
    <aside className="w-full h-full bg-white overflow-y-auto" data-testid="filter-sidebar">
      <div className="px-5 pb-5 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Filters & Jobs</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600"
            onClick={onToggle}
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 border border-blue-100/80">
            <div className="text-xl font-bold text-blue-600" data-testid="stat-total-jobs">
              {isLoading ? <Skeleton className="h-6 w-10" /> : stats.total.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-blue-500/80 mt-0.5">Total Jobs</div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 p-3 border border-violet-100/80">
            <div className="text-xl font-bold text-violet-600" data-testid="stat-visible-jobs">
              {isLoading ? <Skeleton className="h-6 w-10" /> : stats.visible.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-violet-500/80 mt-0.5">Visible</div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 border border-emerald-100/80">
            <div className="text-xl font-bold text-emerald-600" data-testid="stat-visited-jobs">
              {isLoading ? <Skeleton className="h-6 w-10" /> : stats.visited.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-emerald-500/80 mt-0.5">Visited</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-5">
          {/* Location */}
          <div>
            <SectionHeader title="Location" />
            <Select
              value={filters.county || "all"}
              onValueChange={(value) => handleFilterChange('county', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full h-9 rounded-lg bg-gray-50/80 border-gray-200/80 text-sm">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {availableCounties.map(county => (
                  <SelectItem key={county} value={county}>{county}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <CompanyFilter
            companies={availableCompanies}
            value={filters.company || ""}
            onChange={(company) => handleFilterChange('company', company)}
          />

          {/* Project Value */}
          <div>
            <SectionHeader title="Project Value" />
            <Slider
              value={valueRange}
              onValueChange={handleValueRangeChange}
              min={0}
              max={100000000}
              step={100000}
              className="w-full"
              data-testid="slider-value-range"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="font-medium">{formatValue(valueRange[0])}</span>
              <span className="text-gray-300">—</span>
              <span className="font-medium">{formatValue(valueRange[1])}</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <SectionHeader title="Status" />
            <div className="space-y-2">
              <label htmlFor="status-active" className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status-active"
                    checked={filters.status.includes('active')}
                    onCheckedChange={(checked) => handleStatusChange('active', !!checked)}
                    data-testid="checkbox-status-active"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Active Jobs</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5" data-testid="count-active">{stats.active}</span>
              </label>
              <label htmlFor="status-planning" className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status-planning"
                    checked={filters.status.includes('planning')}
                    onCheckedChange={(checked) => handleStatusChange('planning', !!checked)}
                    data-testid="checkbox-status-planning"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Planning</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5" data-testid="count-planning">{stats.planning}</span>
              </label>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <SectionHeader title="Start Date" />
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-9 rounded-lg bg-gray-50/80 border-gray-200/80 text-sm"
              data-testid="input-start-date"
            />
          </div>

          {/* Display Toggles */}
          <div>
            <SectionHeader title="Display" />
            <div className="space-y-2">
              <label htmlFor="show-unvisited" className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-unvisited"
                    checked={!!filters.showUnvisited}
                    onCheckedChange={(checked) => handleFilterChange('showUnvisited', !!checked)}
                  />
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Unvisited Jobs</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{stats.unvisited}</span>
              </label>

              <label htmlFor="show-offices" className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-offices"
                    checked={filters.showOffices !== false}
                    onCheckedChange={(checked) => handleFilterChange('showOffices', !!checked)}
                  />
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0891b2' }} />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Offices</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{stats.offices}</span>
              </label>
            </div>
          </div>

          {/* Temperature */}
          <div>
            <SectionHeader title="Temperature">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferencesModal(true)}
                className="h-6 px-2 text-[11px] text-gray-400 hover:text-gray-600 rounded-md"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </SectionHeader>
            <div className="space-y-2">
              {Object.entries(filterPreferences).map(([key, filter]) => (
                <label key={key} htmlFor={`temp-${key}`} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`temp-${key}`}
                      checked={selectedTemperatures.includes(key)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? Array.from(new Set([...selectedTemperatures, key]))
                          : selectedTemperatures.filter((t: string) => t !== key);
                        handleFilterChange('temperature', next);
                      }}
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: filter.color }} />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{filter.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Favorites */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="flex items-center justify-between w-full mb-3 group"
          >
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Favorites</span>
              {favoriteJobs.length > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-1.5">{favoriteJobs.length}</span>
              )}
            </div>
            {showFavorites ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          {showFavorites && (
            <div className="space-y-2.5" data-testid="favorites-list">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : (
                favoriteJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={() => onJobSelect(job)} />
                ))
              )}
              {!isLoading && favoriteJobs.length === 0 && (
                <div className="text-center py-6">
                  <Star className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No favorites yet</p>
                  <p className="text-xs text-gray-300 mt-0.5">Star a job to pin it here</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FilterPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </aside>
  );
}
