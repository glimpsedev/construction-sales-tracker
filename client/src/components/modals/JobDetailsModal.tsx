import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  MapPin, 
  Building, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  User,
  FileText,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  const [notes, setNotes] = useState(job?.userNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update notes when job changes
  React.useEffect(() => {
    if (job) {
      setNotes(job.userNotes || "");
    }
  }, [job]);

  const markViewedMutation = useMutation({
    mutationFn: async ({ jobId, notes }: { jobId: string; notes: string }) => {
      const response = await fetch(`/api/jobs/${jobId}/mark-viewed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark job as viewed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job Marked as Viewed",
        description: "Job status updated successfully"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark job as viewed"
      });
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ jobId, notes }: { jobId: string; notes: string }) => {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setIsEditing(false);
      toast({
        title: "Notes Updated",
        description: "Job notes saved successfully"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update notes"
      });
    }
  });

  if (!job) return null;

  const handleMarkViewed = () => {
    markViewedMutation.mutate({ jobId: job.id, notes });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({ jobId: job.id, notes });
  };

  const handleCancel = () => {
    setNotes(job.userNotes || "");
    setIsEditing(false);
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "Not specified";
    const num = parseFloat(value);
    return isNaN(num) ? value : `$${num.toLocaleString()}`;
  };

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "Not specified";
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return date.toLocaleDateString();
    } catch {
      return typeof dateValue === 'string' ? dateValue : "Invalid date";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {job.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {job.isViewed ? (
              <Badge variant="secondary" className="bg-gray-100">
                <Eye className="h-3 w-3 mr-1" />
                Viewed
              </Badge>
            ) : (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <EyeOff className="h-3 w-3 mr-1" />
                New
              </Badge>
            )}
            <Badge variant="outline">{job.status}</Badge>
            <Badge variant="outline">{job.type}</Badge>
          </div>

          {/* Description */}
          {job.description && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Location Info */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h4>
              <p className="text-sm">{job.address}</p>
              {job.latitude && job.longitude && (
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {job.latitude}, {job.longitude}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Project Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-500 text-xs">Project Value</label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(job.projectValue)}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Contractor</label>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {job.contractor || "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Start Date</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(job.startDate)}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">End Date</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(job.endDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(job.phone || job.email) && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {job.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${job.phone}`} className="text-blue-600 hover:underline">
                        {job.phone}
                      </a>
                    </div>
                  )}
                  {job.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${job.email}`} className="text-blue-600 hover:underline">
                        {job.email}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dodge Data ID */}
          {job.dodgeJobId && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Dodge Data ID</h4>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {job.dodgeJobId}
                </code>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Notes Section */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Your Notes
                </h4>
                {!isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    data-testid="edit-notes-button"
                  >
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your notes about this job..."
                    className="min-h-[100px]"
                    data-testid="notes-textarea"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={updateNotesMutation.isPending}
                      data-testid="save-notes-button"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {updateNotesMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      data-testid="cancel-notes-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  {job.userNotes || "No notes added yet"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!job.isViewed && (
              <Button
                onClick={handleMarkViewed}
                disabled={markViewedMutation.isPending}
                className="flex-1"
                data-testid="mark-viewed-button"
              >
                <Eye className="h-4 w-4 mr-2" />
                {markViewedMutation.isPending ? "Marking..." : "Mark as Viewed"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className={job.isViewed ? "flex-1" : ""}
              data-testid="close-button"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}