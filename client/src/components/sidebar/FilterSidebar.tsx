import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import JobCard from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import type { Job } from "@shared/schema";

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  jobs: Job[];
  filters: {
    status: string[];
    startDate: string;
    endDate: string;
    minValue: string;
    maxValue: string;
    temperature?: string[];
    hideCold?: boolean;
    county?: string;
    nearMe?: boolean;
  };
  onFilterChange: (filters: any) => void;
  onJobSelect: (job: Job) => void;
  isLoading: boolean;
}

export default function FilterSidebar({ 
  isOpen, 
  onToggle, 
  jobs, 
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
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

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

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(job => job.status === 'active').length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const planning = jobs.filter(job => job.status === 'planning').length;
    const pending = jobs.filter(job => job.status === 'pending').length;

    const cold = jobs.filter(job => job.isCold).length;
    
    // Count jobs as visited if their temperature has been set (Hot/Warm/Cold)
    const visited = jobs.filter(job => job.visited).length;

    return {
      total,
      active,
      completed,
      planning,
      pending,

      cold,
      visited
    };
  }, [jobs]);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime())
      .slice(0, 10);
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

  return (
    <aside 
      className="w-full h-full bg-white overflow-y-auto"
      data-testid="filter-sidebar"
    >
      <div className="p-6">
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.total}
            </div>
            <div className="text-sm text-blue-600">Total Jobs</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-secondary" data-testid="stat-visited-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.visited}
            </div>
            <div className="text-sm text-green-600">Visited</div>
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
              
              {/* Near Me Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="near-me"
                  checked={filters.nearMe === true}
                  onCheckedChange={(checked) => {
                    handleFilterChange('nearMe', checked);
                  }}
                />
                <label htmlFor="near-me" className="text-sm cursor-pointer flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Jobs Near Me (25 miles)
                </label>
              </div>
            </div>
          </div>

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
                    id="status-completed"
                    checked={filters.status.includes('completed')}
                    onCheckedChange={(checked) => handleStatusChange('completed', !!checked)}
                    data-testid="checkbox-status-completed"
                  />
                  <label htmlFor="status-completed" className="text-sm cursor-pointer">Completed</label>
                </div>
                <span className="text-xs text-gray-500" data-testid="count-completed">{stats.completed}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-pending"
                    checked={filters.status.includes('pending')}
                    onCheckedChange={(checked) => handleStatusChange('pending', !!checked)}
                    data-testid="checkbox-status-pending"
                  />
                  <label htmlFor="status-pending" className="text-sm cursor-pointer">Pending</label>
                </div>
                <span className="text-xs text-gray-500" data-testid="count-pending">{stats.pending}</span>
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

          {/* Date Range */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Date Range</h3>
            <div className="space-y-3">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                data-testid="input-start-date"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Temperature Filter */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Temperature</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temp-hot"
                    checked={filters.temperature?.includes('hot')}
                    onCheckedChange={(checked) => {
                      const temps = filters.temperature || [];
                      handleFilterChange('temperature', checked
                        ? [...temps, 'hot']
                        : temps.filter((t: string) => t !== 'hot')
                      );
                    }}
                  />
                  <label htmlFor="temp-hot" className="text-sm cursor-pointer">🔥 Hot</label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temp-warm"
                    checked={filters.temperature?.includes('warm')}
                    onCheckedChange={(checked) => {
                      const temps = filters.temperature || [];
                      handleFilterChange('temperature', checked
                        ? [...temps, 'warm']
                        : temps.filter((t: string) => t !== 'warm')
                      );
                    }}
                  />
                  <label htmlFor="temp-warm" className="text-sm cursor-pointer">🌡️ Warm</label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temp-cold"
                    checked={filters.temperature?.includes('cold')}
                    onCheckedChange={(checked) => {
                      const temps = filters.temperature || [];
                      handleFilterChange('temperature', checked
                        ? [...temps, 'cold']
                        : temps.filter((t: string) => t !== 'cold')
                      );
                    }}
                  />
                  <label htmlFor="temp-cold" className="text-sm cursor-pointer">❄️ Cold</label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temp-green"
                    checked={filters.temperature?.includes('green')}
                    onCheckedChange={(checked) => {
                      const temps = filters.temperature || [];
                      handleFilterChange('temperature', checked
                        ? [...temps, 'green']
                        : temps.filter((t: string) => t !== 'green')
                      );
                    }}
                  />
                  <label htmlFor="temp-green" className="text-sm cursor-pointer">✅ Green</label>
                </div>
              </div>
            </div>
          </div>

          {/* Hide Cold Jobs Filter */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Hide Cold Jobs</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hide-cold"
                  checked={filters.hideCold === true}
                  onCheckedChange={(checked) => {
                    handleFilterChange('hideCold', checked);
                  }}
                />
                <label htmlFor="hide-cold" className="text-sm cursor-pointer">Hide ❄️ Cold</label>
              </div>
              <span className="text-xs text-gray-500">{stats.cold} cold jobs</span>
            </div>
          </div>


        </div>

        {/* Recent Jobs List */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-darktext mb-4">Recent Jobs</h3>
          <div className="space-y-3" data-testid="recent-jobs-list">
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
              recentJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobSelect(job)}
                />
              ))
            )}
            
            {!isLoading && recentJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-inbox text-2xl mb-2 block"></i>
                <p className="text-sm">No jobs found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
