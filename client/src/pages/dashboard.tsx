import { useState, useMemo, useRef, useCallback } from "react";
import { MapContainer } from "@/components/ui/map-container";
import InteractiveMap from "@/components/map/InteractiveMap";
import FilterSidebar from "@/components/sidebar/FilterSidebar";
import AddJobModal from "@/components/modals/AddJobModal";
import { JobDetailsModal } from "@/components/modals/JobDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobs, useJobStats } from "@/hooks/useJobs";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Plus,
  LogOut,
  FileSpreadsheet,
  BarChart3,
  Building2,
  MoreVertical,
  X,
  MapPin,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Job } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

export default function Dashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout>();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    status: ['active'] as string[],
    startDate: '',
    minValue: '100000000',
    maxValue: '100000000',
    temperature: undefined as string[] | undefined,
    hideCold: false,
    county: '',
    nearMe: false,
    company: '',
    showUnvisited: false,
    showOffices: true
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const modifiedFilters = useMemo(() => {
    const newFilters = { ...filters, search: debouncedSearch || undefined };
    if (filters.status.includes('active')) {
      const statusSet = new Set(filters.status);
      statusSet.add('planning');
      newFilters.status = Array.from(statusSet);
    }
    return newFilters;
  }, [filters, debouncedSearch]);

  const { data: fetchedJobs = [], isLoading, refetch } = useJobs(modifiedFilters);
  const { data: globalStats } = useJobStats();

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

  const jobs = fetchedJobs.filter(job => {
    if (job.type === 'office') return filters.showOffices !== false;
    const effectiveStatus = getEffectiveStatus(job);
    if (!filters.status || filters.status.length === 0) return true;
    return filters.status.includes(effectiveStatus);
  });

  const { toast } = useToast();

  const updateTemperatureMutation = useMutation({
    mutationFn: async ({ jobId, temperature }: { jobId: string; temperature: string | null }) => {
      const response = await fetch(`/api/jobs/${jobId}/temperature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ temperature })
      });
      if (!response.ok) throw new Error('Failed to update temperature');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({ title: "Success", description: "Job temperature updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update job temperature", variant: "destructive" });
    }
  });

  const updateJobTemperature = (temperature: string | null) => {
    if (selectedJob) {
      updateTemperatureMutation.mutate({ jobId: selectedJob.id, temperature });
      setSelectedJob({ ...selectedJob, temperature } as Job);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setLocation('/login');
    toast({ title: "Logged Out", description: "You have been successfully logged out" });
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setSidebarOpen(false);
    setShowMobileMenu(false);
    setTimeout(() => setShowJobDetails(true), 50);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="bg-neutral font-sans min-h-screen" data-testid="dashboard">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
        <div className="px-3 md:px-5">
          <div className="flex justify-between items-center h-14 md:h-[60px]">
            {/* Logo */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-base md:text-lg font-semibold text-gray-900 hidden sm:block tracking-tight">
                Construction Tracker
              </h1>
            </div>

            {/* Desktop Search + Nav */}
            <div className="hidden lg:flex items-center gap-2 flex-1 max-w-2xl mx-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search jobs, contractors, addresses..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-9 bg-gray-50/80 border-gray-200/80 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => { handleSearchChange(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant={sidebarOpen ? "default" : "outline"}
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "h-9 gap-1.5 rounded-lg transition-all",
                  sidebarOpen
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                {sidebarOpen ? "Hide Filters" : "Filters"}
              </Button>
              <Link href="/analytics">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg border-gray-200 hover:bg-gray-50">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </Button>
              </Link>
              <Link href="/dodge-import">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg border-gray-200 hover:bg-gray-50">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Import
                </Button>
              </Link>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Job
              </Button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 gap-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mobile Controls */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchOpen(!searchOpen)}
                className="h-9 w-9 p-0 rounded-lg"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={sidebarOpen ? "default" : "outline"}
                onClick={toggleSidebar}
                className={cn("h-9 px-3 rounded-lg", sidebarOpen && "bg-blue-600 text-white")}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="ml-1.5 text-xs">{sidebarOpen ? "Hide" : "Filters"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddModal(true)}
                className="h-9 w-9 p-0 rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="h-9 w-9 p-0 rounded-lg"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {searchOpen && (
            <div className="lg:hidden pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search jobs, contractors, addresses..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm">
            <div className="px-2 py-2 space-y-0.5">
              <Link href="/analytics">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center gap-3 text-sm text-gray-700"
                >
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  Analytics
                </button>
              </Link>
              <Link href="/dodge-import">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center gap-3 text-sm text-gray-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                  Import CSV
                </button>
              </Link>
              <Link href="/equipment">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center gap-3 text-sm text-gray-700"
                >
                  <Building2 className="h-4 w-4 text-gray-400" />
                  Equipment
                </button>
              </Link>
              <div className="border-t border-gray-100 my-1.5" />
              <button
                onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-3 text-sm"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-60px)] relative">
        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className={cn(
              "bg-white border-r border-gray-200/60 shadow-xl",
              "fixed lg:relative",
              "top-14 md:top-[60px] left-0 right-0 bottom-0",
              "w-full lg:w-[380px]",
              "z-50 lg:h-full",
              "animate-in slide-in-from-left duration-200"
            )}
          >
            <FilterSidebar
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              jobs={jobs}
              globalStats={globalStats}
              filters={filters}
              onFilterChange={handleFilterChange}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Map */}
        <main className="flex-1 min-w-0 relative z-0">
          <MapContainer className="h-full w-full">
            <InteractiveMap
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </MapContainer>

          {/* Mobile FAB */}
          <div className="lg:hidden fixed bottom-6 right-6 z-30 flex flex-col gap-3">
            {!sidebarOpen && (
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                onClick={toggleSidebar}
              >
                <Filter className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Desktop Sidebar Toggle (when closed) */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              className="hidden lg:flex absolute top-4 left-4 z-30 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg h-10 px-4 gap-2 rounded-lg"
              onClick={toggleSidebar}
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">Show Filters</span>
            </Button>
          )}
        </main>

        {/* Mobile Overlay Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
            style={{ top: '3.5rem' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Modals */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={showJobDetails && !!selectedJob}
        onClose={() => { setShowJobDetails(false); setSelectedJob(null); }}
      />
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refetch(); }}
      />
    </div>
  );
}
