import { useState } from "react";
import { MapContainer } from "@/components/ui/map-container";
import InteractiveMap from "@/components/map/InteractiveMap";
import FilterSidebar from "@/components/sidebar/FilterSidebar";
import AddJobModal from "@/components/modals/AddJobModal";
import DocumentUploadModal from "@/components/modals/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/hooks/useJobs";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Settings, FileSpreadsheet, Eye } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { Job } from "@shared/schema";

export default function Dashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showJobDetails, setShowJobDetails] = useState(false);
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
    setShowJobDetails(true);
    setSidebarOpen(false); // Close sidebar when viewing job details
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
        {/* Left Panel - Filter Sidebar or Job Details */}
        <div className={cn(
          "transition-all duration-300 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm",
          // Show panel when either sidebar or job details is open
          (sidebarOpen || showJobDetails) ? "lg:w-96 w-full lg:relative absolute" : "lg:w-0 w-0",
          // Mobile: full width overlay
          "h-full z-40",
          !(sidebarOpen || showJobDetails) && "overflow-hidden"
        )}>
          {showJobDetails && selectedJob ? (
            // Job Details Panel
            <div className="w-full h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Job Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowJobDetails(false);
                    setSelectedJob(null);
                    setSidebarOpen(true);
                  }}
                  data-testid="button-close-details"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
              
              {/* Job Information */}
              <div className="space-y-4">
                {/* Project Name and Address */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-darktext">{selectedJob.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {selectedJob.address}
                  </p>
                </div>
                
                {/* Project Value */}
                {selectedJob.projectValue && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Project Value</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${Number(selectedJob.projectValue).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {/* Status and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge className="mt-1">{selectedJob.status}</Badge>
                  </div>
                  {selectedJob.type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <Badge variant="outline" className="mt-1">{selectedJob.type}</Badge>
                    </div>
                  )}
                </div>
                
                {/* Contractor */}
                {selectedJob.contractor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contractor</p>
                    <p className="text-sm font-semibold">{selectedJob.contractor}</p>
                  </div>
                )}
                
                {/* Contact Information */}
                <div className="space-y-2">
                  {selectedJob.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <a 
                        href={`tel:${selectedJob.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        <i className="fas fa-phone"></i>
                        {selectedJob.phone}
                      </a>
                    </div>
                  )}
                  
                  {selectedJob.email && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <a 
                        href={`mailto:${selectedJob.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        <i className="fas fa-envelope"></i>
                        {selectedJob.email}
                      </a>
                    </div>
                  )}
                  
                  {selectedJob.officeContact && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Office Contact</p>
                      <p className="text-sm">{selectedJob.officeContact}</p>
                    </div>
                  )}
                </div>
                
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedJob.startDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Start Date</p>
                      <p className="text-sm">{new Date(selectedJob.startDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedJob.endDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">End Date</p>
                      <p className="text-sm">{new Date(selectedJob.endDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                
                {/* Description */}
                {selectedJob.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm mt-1 text-gray-700">{selectedJob.description}</p>
                  </div>
                )}
                
                {/* Special Conditions */}
                {selectedJob.specialConditions && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Special Conditions</p>
                    <p className="text-sm mt-1 text-gray-700">{selectedJob.specialConditions}</p>
                  </div>
                )}
                
                {/* Dodge Job ID */}
                {selectedJob.dodgeJobId && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dodge Report #</p>
                    <p className="text-sm font-mono">{selectedJob.dodgeJobId}</p>
                  </div>
                )}
                
                {/* User Notes */}
                {selectedJob.userNotes && (
                  <div className="bg-yellow-50 p-3 rounded">
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                    <p className="text-sm mt-1">{selectedJob.userNotes}</p>
                  </div>
                )}
                
                {/* Last Updated */}
                {selectedJob.lastUpdated && (
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(selectedJob.lastUpdated).toLocaleString()}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="pt-4 space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Mark as viewed logic here
                      toast({
                        title: "Job Marked as Viewed",
                        description: "This job has been marked as viewed."
                      });
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Mark as Viewed
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowJobDetails(false);
                      setSelectedJob(null);
                      setSidebarOpen(true);
                    }}
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Filter Sidebar
            <FilterSidebar
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              jobs={jobs}
              filters={filters}
              onFilterChange={handleFilterChange}
              onJobSelect={handleJobSelect}
              isLoading={isLoading}
            />
          )}
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
          {!sidebarOpen && !showJobDetails && (
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
