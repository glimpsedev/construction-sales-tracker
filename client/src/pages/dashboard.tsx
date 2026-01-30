import { useState, useMemo } from "react";
import { MapContainer } from "@/components/ui/map-container";
import InteractiveMap from "@/components/map/InteractiveMap";
import FilterSidebar from "@/components/sidebar/FilterSidebar";
import AddJobModal from "@/components/modals/AddJobModal";
import DocumentUploadModal from "@/components/modals/DocumentUploadModal";
import { JobDetailsModal } from "@/components/modals/JobDetailsModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/hooks/useJobs";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Settings, FileSpreadsheet, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Job } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

export default function Dashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    status: ['active'] as string[],
    startDate: '',
    minValue: '100000000',  // Default to $100M+ for faster loading
    maxValue: '100000000',  // Default to $100M+ for faster loading
    temperature: undefined as string[] | undefined,
    hideCold: false,
    county: '',
    nearMe: false,
    company: '',
    showUnvisited: false,
    showOffices: true
  });

  // Modify filters to fetch both active and planning jobs when active is selected
  // (since planning jobs might actually be active based on start date)
  const modifiedFilters = useMemo(() => {
    const newFilters = { ...filters };
    if (filters.status.includes('active')) {
      // If active is selected, also fetch planning jobs to check if they should be active
      const statusSet = new Set(filters.status);
      statusSet.add('planning');
      newFilters.status = Array.from(statusSet);
    }
    return newFilters;
  }, [filters]);

  const { data: fetchedJobs = [], isLoading, refetch } = useJobs(modifiedFilters);
  
  // Fetch all jobs (without filters) for total count and visited count
  const { data: allJobs = [] } = useJobs({});

  // Apply effective status logic and filter jobs
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

  // Filter jobs based on effective status
  const jobs = fetchedJobs.filter(job => {
    if (job.type === 'office') {
      return filters.showOffices !== false;
    }

    const effectiveStatus = getEffectiveStatus(job);
    
    // If status filter is empty, show all jobs
    if (!filters.status || filters.status.length === 0) return true;
    
    // Check if effective status matches any of the selected filters
    return filters.status.includes(effectiveStatus);
  });
  const { toast } = useToast();

  // Update job temperature mutation
  const updateTemperatureMutation = useMutation({
    mutationFn: async ({ jobId, temperature }: { jobId: string; temperature: string | null }) => {
      const response = await fetch(`/api/jobs/${jobId}/temperature`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ temperature })
      });
      if (!response.ok) throw new Error('Failed to update temperature');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Success",
        description: "Job temperature updated"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job temperature",
        variant: "destructive"
      });
    }
  });

  const updateJobTemperature = (temperature: string | null) => {
    if (selectedJob) {
      updateTemperatureMutation.mutate({ jobId: selectedJob.id, temperature });
      setSelectedJob({ ...selectedJob, temperature } as Job);
    }
  };

  const handleLogout = () => {
    // Clear the JWT token from localStorage
    localStorage.removeItem('authToken');
    // Redirect to login page
    setLocation('/login');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
  };

  const handleJobSelect = (job: Job) => {
    console.log('Job selected:', job.name);
    setSelectedJob(job);
    setSidebarOpen(false);
    setShowMobileMenu(false);
    // Use setTimeout to ensure state is set before opening modal
    setTimeout(() => {
      setShowJobDetails(true);
    }, 50);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="bg-neutral font-sans min-h-screen" data-testid="dashboard">
      {/* Mobile-Optimized Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-3 md:px-6">
          <div className="flex justify-between items-center h-14 md:h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-2">
              <i className="fas fa-map-marked-alt text-primary text-lg md:text-2xl"></i>
              <h1 className="text-base md:text-xl font-semibold text-darktext hidden sm:block">Construction Tracker</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
              <Button 
                variant={sidebarOpen ? "default" : "outline"} 
                size="sm"
                onClick={toggleSidebar}
                className={sidebarOpen ? "bg-primary" : ""}
              >
                <i className="fas fa-filter mr-2"></i>
                {sidebarOpen ? "Hide Filters" : "Show Filters"}
              </Button>
              <Link href="/dodge-import">
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </Link>
              <Link href="/apple-maps-import">
                <Button variant="outline" size="sm">
                  <i className="fas fa-building mr-2"></i>
                  Import Offices
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                <i className="fas fa-file-upload mr-2"></i>
                Upload Docs
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-blue-700"
                onClick={() => setShowAddModal(true)}
              >
                <i className="fas fa-plus mr-2"></i>
                Add Job
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Log Out
              </Button>
            </div>
            
            {/* Mobile Controls */}
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                size="sm"
                variant={sidebarOpen ? "default" : "outline"}
                onClick={toggleSidebar}
                className={sidebarOpen ? "bg-primary px-3" : "px-3"}
              >
                <i className="fas fa-filter"></i>
                <span className="ml-2">{sidebarOpen ? "Hide" : "Filters"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddModal(true)}
                className="px-2"
              >
                <i className="fas fa-plus"></i>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <i className="fas fa-ellipsis-v"></i>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t bg-white">
            <div className="px-3 py-2 space-y-1">
              <Link href="/dodge-import">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import CSV
                </button>
              </Link>
              <Link href="/apple-maps-import">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <i className="fas fa-building"></i>
                  Import Offices
                </button>
              </Link>
              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <i className="fas fa-file-upload"></i>
                Upload Documents
              </button>
              <Link href="/equipment">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Equipment
                </button>
              </Link>
              <Link href="/email-setup">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Setup
                </button>
              </Link>
              <div className="border-t my-2"></div>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
              >
                <i className="fas fa-sign-out-alt"></i>
                Log Out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
        {/* Left Panel - Filter Sidebar */}
        {sidebarOpen && (
          <div 
            className={cn(
              "bg-white border-r border-gray-200 shadow-xl",
              // Mobile: full screen overlay
              "fixed lg:relative",
              "top-14 md:top-16 left-0 right-0 bottom-0",
              "w-full lg:w-96",
              "z-50",
              "lg:h-full"
            )}
          >
            <FilterSidebar
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              jobs={jobs}
              allJobs={allJobs}
              filters={filters}
              onFilterChange={handleFilterChange}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Main Map Area - Always Visible */}
        <main className="flex-1 min-w-0 relative z-0">
          <MapContainer className="h-full w-full">
            <InteractiveMap
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </MapContainer>
          
          {/* Mobile Floating Action Buttons */}
          <div className="lg:hidden fixed bottom-6 right-6 z-30 flex flex-col gap-3">
            {/* Filter Toggle Button */}
            {!sidebarOpen && (
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-blue-700 text-white"
                onClick={toggleSidebar}
                data-testid="button-open-filter"
              >
                <i className="fas fa-filter text-xl"></i>
              </Button>
            )}
          </div>
          
          {/* Desktop Filter Toggle */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              className="hidden lg:flex absolute top-4 left-4 z-30 bg-primary hover:bg-blue-700 text-white shadow-lg h-12 px-4 gap-2"
              onClick={toggleSidebar}
              data-testid="button-open-sidebar"
            >
              <i className="fas fa-filter"></i>
              <span>Show Filters</span>
            </Button>
          )}
        </main>
        
        {/* Mobile Overlay Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            style={{ top: '3.5rem' }}
            onClick={() => {
              setSidebarOpen(false);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={showJobDetails && !!selectedJob}
        onClose={() => {
          setShowJobDetails(false);
          setSelectedJob(null);
        }}
      />

      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          refetch();
        }}
      />

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
