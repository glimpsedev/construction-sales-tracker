import { useState } from "react";
import { MapContainer } from "@/components/ui/map-container";
import InteractiveMap from "@/components/map/InteractiveMap";
import FilterSidebar from "@/components/sidebar/FilterSidebar";
import { JobDetailsModal } from "@/components/modals/JobDetailsModal";
import AddJobModal from "@/components/modals/AddJobModal";
import DocumentUploadModal from "@/components/modals/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/hooks/useJobs";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Settings, FileSpreadsheet } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
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
  const { toast } = useToast();

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
              
              {/* Navigation Tabs */}
              <div className="hidden lg:flex items-center space-x-6 ml-8">
                <a href="/" className="text-primary font-medium border-b-2 border-primary pb-1">
                  Job Sites
                </a>
                <a href="/equipment" className="text-gray-600 hover:text-primary font-medium pb-1">
                  Equipment
                </a>
                <a href="/email-setup" className="text-gray-600 hover:text-primary font-medium pb-1 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email Setup
                </a>
                <a href="/dodge-import" className="text-gray-600 hover:text-primary font-medium pb-1 flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  Dodge Import
                </a>
              </div>
              
              {/* Navigation Link to Database Management */}
              <a href="/database" className="text-gray-600 hover:text-primary font-medium pb-1 flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Database
              </a>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Document Upload Button */}
              <Button
                variant="outline"
                className="hidden lg:inline-flex items-center"
                onClick={() => setShowUploadModal(true)}
                data-testid="button-upload-docs"
              >
                <i className="fas fa-file-upload mr-2"></i>
                <span>Upload Docs</span>
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
                className="lg:hidden p-2"
                onClick={toggleSidebar}
                data-testid="button-menu-toggle"
              >
                <i className="fas fa-bars"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Filter Sidebar - Fixed width, responsive for mobile */}
        <div className={cn(
          "transition-all duration-300 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm",
          // Desktop: sidebar takes space in layout
          sidebarOpen ? "lg:w-80 w-80" : "lg:w-0 w-0",
          // Mobile: overlay sidebar
          "lg:relative absolute lg:static h-full",
          sidebarOpen ? "left-0 z-40" : "-left-80",
          !sidebarOpen && "overflow-hidden"
        )}>
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
        <main className="flex-1 min-w-0 relative">
          <MapContainer className="h-full w-full">
            <InteractiveMap
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          </MapContainer>
          
          {/* Toggle Button when sidebar is closed */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 left-4 z-30 bg-white shadow-md"
              onClick={toggleSidebar}
              data-testid="button-open-sidebar"
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
        </main>
        
        {/* Mobile overlay backdrop when sidebar is open */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </div>

      {/* Modals */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
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
