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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    console.log('Job selected:', job.name);
    setSelectedJob(job);
    setShowJobDetails(true);
    setSidebarOpen(false);
    setShowMobileMenu(false);
    // Force a small delay to ensure state updates
    setTimeout(() => {
      const panel = document.querySelector('.job-details-panel');
      if (panel) {
        console.log('Panel found, should be visible');
      }
    }, 100);
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
              <Link href="/dodge-import">
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
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
            </div>
            
            {/* Mobile Controls */}
            <div className="flex items-center gap-2 lg:hidden">
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
            </div>
          </div>
        )}
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
        {/* Left Panel - Mobile Slide-in, Desktop Fixed */}
        {(sidebarOpen || showJobDetails) && (
          <div 
            className={cn(
              "job-details-panel",
              "bg-white border-r border-gray-200 shadow-xl",
              // Mobile: full screen overlay
              "fixed lg:relative",
              "top-14 md:top-16 left-0 right-0 bottom-0",
              "w-full lg:w-96",
              "z-50",
              "lg:h-full"
            )}
          >
          {showJobDetails && selectedJob ? (
            // Job Details Panel - Mobile Optimized
            <div className="w-full h-full overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Job Details</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSidebarOpen(true);
                      setShowJobDetails(false);
                    }}
                    className="lg:hidden"
                  >
                    <i className="fas fa-filter mr-2"></i>
                    Filters
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowJobDetails(false);
                      setSelectedJob(null);
                      setSidebarOpen(false);
                    }}
                    data-testid="button-close-details"
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                </div>
              </div>
              
              {/* Job Information - All CSV Data */}
              <div className="space-y-3">
                {/* Project Name and Address */}
                <div className="border-b pb-3">
                  <h3 className="text-base md:text-lg font-semibold text-darktext">{selectedJob.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {selectedJob.address}
                  </p>
                </div>
                
                {/* Project Value - Prominent Display */}
                {selectedJob.projectValue && (
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs font-medium text-gray-500">Project Value</p>
                    <p className="text-xl font-bold text-green-600">
                      ${Number(selectedJob.projectValue).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {/* Important Dates */}
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs font-medium text-gray-500 mb-2">Project Timeline</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Start/Bid Date</p>
                      <p className="text-sm font-medium">
                        {selectedJob.startDate ? new Date(selectedJob.startDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="text-sm font-medium">
                        {selectedJob.endDate ? new Date(selectedJob.endDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Status and Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Status</p>
                    <Badge className="mt-1 text-xs">{selectedJob.status || 'Unknown'}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Type</p>
                    <Badge variant="outline" className="mt-1 text-xs">{selectedJob.type || 'Commercial'}</Badge>
                  </div>
                </div>
                
                {/* Key Players Section */}
                <div className="bg-gray-50 p-3 rounded space-y-2">
                  <p className="text-xs font-medium text-gray-700 mb-2">Project Team</p>
                  
                  {selectedJob.contractor && (
                    <div>
                      <p className="text-xs text-gray-500">General Contractor</p>
                      <p className="text-sm font-medium">{selectedJob.contractor}</p>
                    </div>
                  )}
                  
                  {selectedJob.officeContact && (
                    <div>
                      <p className="text-xs text-gray-500">Architect/Office Contact</p>
                      <p className="text-sm font-medium">{selectedJob.officeContact}</p>
                    </div>
                  )}
                  
                  {selectedJob.orderedBy && (
                    <div>
                      <p className="text-xs text-gray-500">Ordered By</p>
                      <p className="text-sm font-medium">{selectedJob.orderedBy}</p>
                    </div>
                  )}
                </div>
                
                {/* Contact Information - Clickable */}
                {(selectedJob.phone || selectedJob.email) && (
                  <div className="bg-yellow-50 p-3 rounded space-y-2">
                    <p className="text-xs font-medium text-gray-700 mb-2">Contact Information</p>
                    
                    {selectedJob.phone && (
                      <a 
                        href={`tel:${selectedJob.phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <i className="fas fa-phone text-xs"></i>
                        <span className="text-sm font-medium">{selectedJob.phone}</span>
                      </a>
                    )}
                    
                    {selectedJob.email && (
                      <a 
                        href={`mailto:${selectedJob.email}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <i className="fas fa-envelope text-xs"></i>
                        <span className="text-sm font-medium break-all">{selectedJob.email}</span>
                      </a>
                    )}
                  </div>
                )}
                
                {/* Full Project Description - Contains All CSV Info */}
                {selectedJob.description && (
                  <div className="border rounded p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Full Project Details</p>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">
                      {selectedJob.description.split('\n').map((line, idx) => (
                        <div key={idx} className="mb-1">
                          {line.includes('Owner:') || line.includes('Architect:') || line.includes('Tags:') ? (
                            <span className="font-medium">{line}</span>
                          ) : (
                            line
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additional Information */}
                {selectedJob.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Tags/Notes</p>
                    <p className="text-sm mt-1">{selectedJob.notes}</p>
                  </div>
                )}
                
                {selectedJob.specialConditions && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Special Conditions</p>
                    <p className="text-sm mt-1">{selectedJob.specialConditions}</p>
                  </div>
                )}
                
                {/* Tracking Information */}
                <div className="border-t pt-3 space-y-2">
                  {selectedJob.dodgeJobId && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Dodge Report #</span>
                      <span className="text-xs font-mono">{selectedJob.dodgeJobId}</span>
                    </div>
                  )}
                  
                  {selectedJob.isViewed && selectedJob.viewedAt && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">First Viewed</span>
                      <span className="text-xs">{new Date(selectedJob.viewedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {selectedJob.lastUpdated && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Last Updated</span>
                      <span className="text-xs">{new Date(selectedJob.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {/* User Personal Notes */}
                {selectedJob.userNotes && (
                  <div className="bg-amber-50 p-3 rounded">
                    <p className="text-xs font-medium text-gray-700">Your Notes</p>
                    <p className="text-sm mt-1">{selectedJob.userNotes}</p>
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
        )}

        {/* Main Map Area - Always Visible */}
        <main className="flex-1 min-w-0 relative">
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
            {!sidebarOpen && !showJobDetails && (
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-white hover:bg-gray-100"
                onClick={toggleSidebar}
                data-testid="button-open-filter"
              >
                <i className="fas fa-filter text-xl"></i>
              </Button>
            )}
          </div>
          
          {/* Desktop Filter Toggle */}
          {!sidebarOpen && !showJobDetails && (
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex absolute top-4 left-4 z-30 bg-white shadow-md"
              onClick={toggleSidebar}
              data-testid="button-open-sidebar"
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
        </main>
        
        {/* Mobile Overlay Backdrop */}
        {(sidebarOpen || showJobDetails) && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            style={{ top: '3.5rem' }}
            onClick={() => {
              setSidebarOpen(false);
              setShowJobDetails(false);
              setSelectedJob(null);
            }}
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
