import { useState } from "react";
import { MapContainer } from "@/components/ui/map-container";
import InteractiveMap from "@/components/map/InteractiveMap";
import FilterSidebar from "@/components/sidebar/FilterSidebar";
import JobDetailsModal from "@/components/modals/JobDetailsModal";
import AddJobModal from "@/components/modals/AddJobModal";
import DocumentUploadModal from "@/components/modals/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/hooks/useJobs";
import type { Job } from "@shared/schema";

export default function Dashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: ['active'] as string[],
    type: [] as string[],
    startDate: '',
    endDate: '',
    minValue: '',
    maxValue: ''
  });

  const { data: jobs = [], isLoading, refetch } = useJobs(filters);

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="bg-neutral font-sans min-h-screen" data-testid="dashboard">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <i className="fas fa-map-marked-alt text-primary text-2xl mr-3"></i>
                <h1 className="text-xl font-semibold text-darktext">Construction Sales Tracker</h1>
              </div>
              
              {/* Data Status Indicator */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-secondary/10 rounded-full">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                <span className="text-sm text-secondary font-medium">Live Data</span>
                <span className="text-xs text-gray-500">Updated recently</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Document Upload Button */}
              <Button
                variant="outline"
                className="inline-flex items-center"
                onClick={() => setShowUploadModal(true)}
                data-testid="button-upload-docs"
              >
                <i className="fas fa-file-upload mr-2"></i>
                <span className="hidden sm:inline">Upload Docs</span>
              </Button>
              
              {/* Add Job Button */}
              <Button
                className="inline-flex items-center bg-primary hover:bg-blue-700"
                onClick={() => setShowAddModal(true)}
                data-testid="button-add-job"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Job
              </Button>
              
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                className="sm:hidden p-2"
                onClick={toggleSidebar}
                data-testid="button-menu-toggle"
              >
                <i className="fas fa-bars"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Filter Sidebar - Fixed width */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}>
          <FilterSidebar
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            jobs={jobs}
            filters={filters}
            onFilterChange={handleFilterChange}
            onJobSelect={handleJobSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Main Map Area - Takes remaining space */}
        <main className="flex-1 relative min-w-0">
          <MapContainer className="h-full w-full">
            <InteractiveMap
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </MapContainer>
        </main>
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={refetch}
        />
      )}

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
