import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Save,
  Flame,
  Thermometer,
  Snowflake
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
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamData, setTeamData] = useState({
    contractor: job?.contractor || "",
    owner: job?.owner || "",
    architect: job?.architect || "",
    orderedBy: job?.orderedBy || "",
    officeContact: job?.officeContact || ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update notes and team data when job changes
  React.useEffect(() => {
    if (job) {
      setNotes(job.userNotes || "");
      setTeamData({
        contractor: job.contractor || "",
        owner: job.owner || "",
        architect: job.architect || "",
        orderedBy: job.orderedBy || "",
        officeContact: job.officeContact || ""
      });
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

  const updateTeamMutation = useMutation({
    mutationFn: async ({ jobId, teamData }: { jobId: string; teamData: any }) => {
      const response = await fetch(`/api/jobs/${jobId}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update team information');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Team Information Updated",
        description: "Project team has been updated successfully"
      });
      setIsEditingTeam(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update team information"
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

  const updateTemperatureMutation = useMutation({
    mutationFn: async ({ jobId, temperature }: { jobId: string; temperature: string }) => {
      const response = await fetch(`/api/jobs/${jobId}/temperature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  const handleSaveTeam = () => {
    if (!job) return;
    updateTeamMutation.mutate({ jobId: job.id, teamData });
  };

  const handleCancelTeam = () => {
    setTeamData({
      contractor: job?.contractor || "",
      owner: job?.owner || "",
      architect: job?.architect || "",
      orderedBy: job?.orderedBy || "",
      officeContact: job?.officeContact || ""
    });
    setIsEditingTeam(false);
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{ zIndex: 9999 }}
        aria-describedby="job-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span className="truncate">{job.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
              data-testid="close-modal-button"
            >
              Close
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div id="job-details-description" className="sr-only">
          Job details and project team information
        </div>

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

          {/* Temperature Rating */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 text-sm">Job Temperature</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={job.temperature === 'hot' ? 'default' : 'outline'}
                  className={job.temperature === 'hot' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                  onClick={() => updateTemperatureMutation.mutate({ jobId: job.id, temperature: 'hot' })}
                  disabled={updateTemperatureMutation.isPending}
                >
                  <Flame className="h-4 w-4 mr-1" />
                  Hot
                </Button>
                <Button
                  size="sm"
                  variant={job.temperature === 'warm' ? 'default' : 'outline'}
                  className={job.temperature === 'warm' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                  onClick={() => updateTemperatureMutation.mutate({ jobId: job.id, temperature: 'warm' })}
                  disabled={updateTemperatureMutation.isPending}
                >
                  <Thermometer className="h-4 w-4 mr-1" />
                  Warm
                </Button>
                <Button
                  size="sm"
                  variant={job.temperature === 'cold' ? 'default' : 'outline'}
                  className={job.temperature === 'cold' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                  onClick={() => updateTemperatureMutation.mutate({ jobId: job.id, temperature: 'cold' })}
                  disabled={updateTemperatureMutation.isPending}
                >
                  <Snowflake className="h-4 w-4 mr-1" />
                  Cold
                </Button>
              </div>
            </CardContent>
          </Card>

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
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline cursor-pointer"
                data-testid="address-link"
              >
                {job.address}
              </a>
              {job.latitude && job.longitude && (
                <a
                  href={`https://maps.google.com/?q=${job.latitude},${job.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-blue-600 hover:underline mt-1 block cursor-pointer"
                  data-testid="coordinates-link"
                >
                  Coordinates: {job.latitude}, {job.longitude}
                </a>
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

          {/* Project Team */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Project Team
                </h4>
                {!isEditingTeam && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingTeam(true)}
                    data-testid="edit-team-button"
                  >
                    Edit
                  </Button>
                )}
              </div>

              {isEditingTeam ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Contractor</label>
                    <Input
                      value={teamData.contractor}
                      onChange={(e) => setTeamData({...teamData, contractor: e.target.value})}
                      placeholder="Enter contractor name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Owner</label>
                    <Input
                      value={teamData.owner}
                      onChange={(e) => setTeamData({...teamData, owner: e.target.value})}
                      placeholder="Enter owner name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Architect</label>
                    <Input
                      value={teamData.architect}
                      onChange={(e) => setTeamData({...teamData, architect: e.target.value})}
                      placeholder="Enter architect name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ordered By</label>
                    <Input
                      value={teamData.orderedBy}
                      onChange={(e) => setTeamData({...teamData, orderedBy: e.target.value})}
                      placeholder="Enter who ordered the project"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Office Contact</label>
                    <Input
                      value={teamData.officeContact}
                      onChange={(e) => setTeamData({...teamData, officeContact: e.target.value})}
                      placeholder="Enter office contact name"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveTeam}
                      disabled={updateTeamMutation.isPending}
                      data-testid="save-team-button"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {updateTeamMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelTeam}
                      data-testid="cancel-team-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Contractor:</span>{" "}
                    <span className="font-medium">{job.contractor || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Owner:</span>{" "}
                    <span className="font-medium">{job.owner || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Architect:</span>{" "}
                    <span className="font-medium">{job.architect || "Not specified"}</span>
                  </div>
                  {job.orderedBy && (
                    <div>
                      <span className="text-gray-500">Ordered By:</span>{" "}
                      <span className="font-medium">{job.orderedBy}</span>
                    </div>
                  )}
                  {job.officeContact && (
                    <div>
                      <span className="text-gray-500">Office Contact:</span>{" "}
                      <span className="font-medium">{job.officeContact}</span>
                    </div>
                  )}
                </div>
              )}
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