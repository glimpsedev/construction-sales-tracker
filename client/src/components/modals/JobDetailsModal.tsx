import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Job } from "@shared/schema";

interface JobDetailsModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function JobDetailsModal({ job, isOpen, onClose, onUpdate }: JobDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleMarkCompleted = async () => {
    if (job.status === 'completed') return;
    
    try {
      setIsUpdating(true);
      await apiRequest('PUT', `/api/jobs/${job.id}`, { status: 'completed' });
      toast({
        title: "Success",
        description: "Job marked as completed"
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGetDirections = () => {
    if (job.address) {
      const encodedAddress = encodeURIComponent(job.address);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const handleExportJob = () => {
    const jobData = {
      ...job,
      exported_at: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(jobData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `job-${job.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-secondary/20 text-secondary';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value?: string) => {
    if (!value) return 'Not specified';
    const numValue = parseFloat(value);
    return `$${numValue.toLocaleString()}`;
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto" data-testid="job-details-modal">
        <DialogHeader>
          <DialogTitle className="text-xl" data-testid="modal-title">
            {job.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-darktext mb-3">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Address</label>
                  <p className="font-mono text-sm" data-testid="job-address">
                    {job.address}
                  </p>
                </div>
                
                {job.contractor && (
                  <div>
                    <label className="text-xs text-gray-500">General Contractor</label>
                    <p className="text-sm" data-testid="job-contractor">
                      {job.contractor}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-gray-500">Project Value</label>
                  <p className="text-lg font-semibold text-primary" data-testid="job-value">
                    {formatValue(job.projectValue)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <Badge className={getStatusColor(job.status)} data-testid="job-status">
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Project Type</label>
                  <Badge variant="outline" data-testid="job-type">
                    {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Timeline Information */}
            <div>
              <h3 className="text-sm font-medium text-darktext mb-3">Timeline</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <p className="text-sm" data-testid="job-start-date">
                    {formatDate(job.startDate)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Target Completion</label>
                  <p className="text-sm" data-testid="job-end-date">
                    {formatDate(job.endDate)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Last Updated</label>
                  <p className="text-sm text-gray-600" data-testid="job-last-updated">
                    {formatDate(job.lastUpdated)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Created</label>
                  <p className="text-sm text-gray-600" data-testid="job-created">
                    {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Special Conditions */}
          {job.specialConditions && (
            <div>
              <h3 className="text-sm font-medium text-darktext mb-3">Special Conditions</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800" data-testid="job-special-conditions">
                  {job.specialConditions}
                </p>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(job.orderedBy || job.officeContact) && (
            <div>
              <h3 className="text-sm font-medium text-darktext mb-3">Contacts</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {job.orderedBy && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium">Ordered By</h4>
                    <p className="text-sm mt-1" data-testid="job-ordered-by">
                      {job.orderedBy}
                    </p>
                  </div>
                )}
                
                {job.officeContact && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium">Office Contact</h4>
                    <p className="text-sm mt-1" data-testid="job-office-contact">
                      {job.officeContact}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <div>
              <h3 className="text-sm font-medium text-darktext mb-3">Notes</h3>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800" data-testid="job-notes">
                  {job.notes}
                </p>
              </div>
            </div>
          )}

          {/* Source Information */}
          <div className="text-xs text-gray-500 flex items-center space-x-4">
            {job.isCustom && (
              <span className="flex items-center">
                <i className="fas fa-user mr-1"></i>
                Custom Job
              </span>
            )}
            
            {job.dodgeJobId && (
              <span className="flex items-center">
                <i className="fas fa-database mr-1"></i>
                Dodge ID: {job.dodgeJobId}
              </span>
            )}
            
            {job.latitude && job.longitude && (
              <span className="flex items-center">
                <i className="fas fa-map-marker-alt mr-1"></i>
                {parseFloat(job.latitude).toFixed(4)}, {parseFloat(job.longitude).toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {job.status !== 'completed' && (
            <Button
              className="bg-secondary hover:bg-green-600"
              onClick={handleMarkCompleted}
              disabled={isUpdating}
              data-testid="button-mark-completed"
            >
              <i className="fas fa-check mr-2"></i>
              {isUpdating ? 'Updating...' : 'Mark Completed'}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleGetDirections}
            data-testid="button-get-directions"
          >
            <i className="fas fa-route mr-2"></i>
            Get Directions
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportJob}
            data-testid="button-export-job"
          >
            <i className="fas fa-download mr-2"></i>
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
