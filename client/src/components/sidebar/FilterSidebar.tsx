import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import JobCard from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@shared/schema";

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  jobs: Job[];
  filters: {
    search: string;
    status: string[];
    type: string[];
    startDate: string;
    endDate: string;
    minValue: string;
    maxValue: string;
    temperature?: string[];
    viewStatus?: string;
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
  const [valueRange, setValueRange] = useState([0]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(job => job.status === 'active').length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const planning = jobs.filter(job => job.status === 'planning').length;
    const pending = jobs.filter(job => job.status === 'pending').length;
    const commercial = jobs.filter(job => job.type === 'commercial').length;
    const residential = jobs.filter(job => job.type === 'residential').length;
    const industrial = jobs.filter(job => job.type === 'industrial').length;
    const equipment = jobs.filter(job => job.type === 'equipment').length;

    return {
      total,
      active,
      completed,
      planning,
      pending,
      commercial,
      residential,
      industrial,
      equipment
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

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.type, type]
      : filters.type.filter(t => t !== type);
    handleFilterChange('type', newTypes);
  };

  const handleValueRangeChange = (value: number[]) => {
    setValueRange(value);
    handleFilterChange('maxValue', value[0].toString());
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
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
            <div className="text-2xl font-bold text-secondary" data-testid="stat-completed-jobs">
              {isLoading ? <Skeleton className="h-6 w-12" /> : stats.completed}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search jobs, addresses..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>

        {/* Filter Sections */}
        <div className="space-y-6">
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

          {/* Project Type Filter */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Project Type</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-commercial"
                    checked={filters.type.includes('commercial')}
                    onCheckedChange={(checked) => handleTypeChange('commercial', !!checked)}
                    data-testid="checkbox-type-commercial"
                  />
                  <label htmlFor="type-commercial" className="text-sm cursor-pointer">Commercial</label>
                </div>
                <span className="text-xs text-gray-500">{stats.commercial}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-residential"
                    checked={filters.type.includes('residential')}
                    onCheckedChange={(checked) => handleTypeChange('residential', !!checked)}
                    data-testid="checkbox-type-residential"
                  />
                  <label htmlFor="type-residential" className="text-sm cursor-pointer">Residential</label>
                </div>
                <span className="text-xs text-gray-500">{stats.residential}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-industrial"
                    checked={filters.type.includes('industrial')}
                    onCheckedChange={(checked) => handleTypeChange('industrial', !!checked)}
                    data-testid="checkbox-type-industrial"
                  />
                  <label htmlFor="type-industrial" className="text-sm cursor-pointer">Industrial</label>
                </div>
                <span className="text-xs text-gray-500">{stats.industrial}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-equipment"
                    checked={filters.type.includes('equipment')}
                    onCheckedChange={(checked) => handleTypeChange('equipment', !!checked)}
                    data-testid="checkbox-type-equipment"
                  />
                  <label htmlFor="type-equipment" className="text-sm cursor-pointer">Equipment</label>
                </div>
                <span className="text-xs text-gray-500">{stats.equipment}</span>
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
            </div>
          </div>

          {/* Value Range */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Project Value</h3>
            <div className="space-y-3">
              <Slider
                value={valueRange}
                onValueChange={handleValueRangeChange}
                max={10000000}
                step={50000}
                className="w-full"
                data-testid="slider-value-range"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$0</span>
                <span data-testid="text-value-display">{formatValue(valueRange[0])}</span>
                <span>$10M+</span>
              </div>
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
