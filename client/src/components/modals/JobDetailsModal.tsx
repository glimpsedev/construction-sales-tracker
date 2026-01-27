import React, { useState, useMemo } from "react";
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
  Snowflake,
  CheckCircle,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { getMergedFilterPreferences } from "@/lib/utils";

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  const [notes, setNotes] = useState(job?.userNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [isFavorite, setIsFavorite] = useState(job?.isFavorite ?? false);
  const [teamData, setTeamData] = useState({
    contractor: job?.contractor || "",
    owner: job?.owner || "",
    architect: job?.architect || "",
    orderedBy: job?.orderedBy || "",
    officeContact: job?.officeContact || ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { preferences } = useFilterPreferences();

  // Merge user preferences with defaults - using shared utility to ensure synchronization
  // with FilterSidebar component
  const filterPreferences = useMemo(() => {
    return getMergedFilterPreferences(preferences);
  }, [preferences]);

  // Update notes and team data when job changes
  React.useEffect(() => {
    if (job) {
      setNotes(job.userNotes || "");
      setIsFavorite(job.isFavorite);
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
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify(teamData)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
        }
        throw new Error('Failed to update team information');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
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
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
        }
        throw new Error('Failed to update notes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
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
    mutationFn: async ({ jobId, temperature }: { jobId: string; temperature: string | null }) => {
      const response = await fetch(`/api/jobs/${jobId}/temperature`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ temperature })
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
        }
        throw new Error('Failed to update temperature');
      }
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

  const markColdMutation = useMutation({
    mutationFn: async ({ jobId, isCold }: { jobId: string; isCold: boolean }) => {
      const response = await fetch(`/api/jobs/${jobId}/cold`, {
        method: isCold ? 'POST' : 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
        }
        throw new Error('Failed to update cold status');
      }
      return response.json();
    },
    onSuccess: (_, { isCold }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Success",
        description: isCold ? "Job marked as cold" : "Job unmarked as cold"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cold status",
        variant: "destructive"
      });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ jobId, isFavorite }: { jobId: string; isFavorite: boolean }) => {
      const response = await fetch(`/api/jobs/${jobId}/favorite`, {
        method: isFavorite ? 'POST' : 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
        }
        throw new Error('Failed to update favorite status');
      }
      return response.json();
    },
    onSuccess: (_, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setIsFavorite(isFavorite);
      toast({
        title: "Success",
        description: isFavorite ? "Job added to favorites" : "Job removed from favorites"
      });
    },
    onError: () => {
      setIsFavorite(job?.isFavorite ?? false);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
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

  // Determine the effective status based on target start date
  const getEffectiveStatus = (job: Job) => {
    if (job.status === 'completed') return 'completed'; // Don't change completed status
    
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      // If start date has passed and job is in planning, mark as active
      if (startDate <= today && job.status === 'planning') {
        return 'active';
      }
    }
    
    return job.status;
  };

  const effectiveStatus = getEffectiveStatus(job);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{ zIndex: 9999 }}
        aria-describedby="job-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{job.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 flex-shrink-0 ${
                  isFavorite 
                    ? 'text-yellow-500 hover:text-yellow-600' 
                    : 'text-gray-300 hover:text-yellow-500'
                }`}
                onClick={() => {
                  const nextFavorite = !isFavorite;
                  setIsFavorite(nextFavorite);
                  toggleFavoriteMutation.mutate({ jobId: job.id, isFavorite: nextFavorite });
                }}
                data-testid={`button-favorite-modal-${job.id}`}
                title={isFavorite ? "Remove job from favorites" : "Add job to favorites"}
                aria-label={isFavorite ? "Remove job from favorites" : "Add job to favorites"}
              >
                <Star className={`h-5 w-5 ${isFavorite ? 'fill-current text-yellow-500' : ''}`} />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden ml-2"
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
          {/* Status Badge and Dodge ID */}
          <div className="flex items-center justify-between">
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
              <Badge variant="outline">{effectiveStatus}</Badge>
              <Badge variant="outline">{job.type}</Badge>
            </div>
            {job.dodgeJobId && (
              <a
                href={`https://www.google.com/search?q=Dodge+Data+Analytics+${encodeURIComponent(job.dodgeJobId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                title="Search for this project in Dodge Data & Analytics"
                data-testid="dodge-id-link"
              >
                <FileText className="h-3 w-3" />
                Dodge ID: {job.dodgeJobId}
              </a>
            )}
          </div>

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
                  <label className="text-gray-500 text-xs">Valuation</label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(job.projectValue)}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">County</label>
                  <div>{job.county || "Not specified"}</div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Target Start Date</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(job.startDate)}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Target Completion Date</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(job.endDate)}
                  </div>
                </div>
                {job.specialConditions && (
                  <div className="col-span-2">
                    <label className="text-gray-500 text-xs">Delivery System</label>
                    <div>{job.specialConditions}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Temperature Rating */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 text-sm">Job Temperature</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filterPreferences).map(([key, filter]) => {
                  const isSelected = job.temperature === key;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      style={isSelected ? { backgroundColor: filter.color, borderColor: filter.color } : {}}
                      className={isSelected ? 'text-white hover:opacity-90' : ''}
                      onClick={() => updateTemperatureMutation.mutate({ jobId: job.id, temperature: key })}
                      disabled={updateTemperatureMutation.isPending}
                    >
                      {filter.name}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateTemperatureMutation.mutate({ jobId: job.id, temperature: null })}
                  disabled={
                    updateTemperatureMutation.isPending ||
                    (!job.temperature && !job.visited)
                  }
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Description / Additional Features */}
          {(job.description || job.additionalFeatures) && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {job.additionalFeatures || job.description}
                </p>
              </CardContent>
            </Card>
          )}

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
                    <label className="text-sm font-medium">General Contractor (GC)</label>
                    <Input
                      value={teamData.contractor}
                      onChange={(e) => setTeamData({...teamData, contractor: e.target.value})}
                      onBlur={() => handleSaveTeam()}
                      placeholder="Enter contractor name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Owner Company</label>
                    <Input
                      value={teamData.owner}
                      onChange={(e) => setTeamData({...teamData, owner: e.target.value})}
                      onBlur={() => handleSaveTeam()}
                      placeholder="Enter owner name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Architect</label>
                    <Input
                      value={teamData.architect}
                      onChange={(e) => setTeamData({...teamData, architect: e.target.value})}
                      onBlur={() => handleSaveTeam()}
                      placeholder="Enter architect name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">GC Contact Name</label>
                    <Input
                      value={teamData.officeContact}
                      onChange={(e) => setTeamData({...teamData, officeContact: e.target.value})}
                      onBlur={() => handleSaveTeam()}
                      placeholder="Enter GC contact name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ordered By</label>
                    <Input
                      value={teamData.orderedBy}
                      onChange={(e) => setTeamData({...teamData, orderedBy: e.target.value})}
                      onBlur={() => handleSaveTeam()}
                      placeholder="Enter who ordered the project"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">General Contractor (GC):</span>{" "}
                    <span className="font-medium">{job.contractor || "Not specified"}</span>
                  </div>
                  {(job.contractorPhone || job.contractorEmail || job.contractorWebsite || job.contractorContact) && (
                    <div className="ml-4 space-y-1">
                      {job.contractorContact && (
                        <div>
                          <span className="text-gray-400">Contact:</span>{" "}
                          <span className="font-medium">{job.contractorContact}</span>
                        </div>
                      )}
                      {job.contractorPhone && (
                        <div>
                          <span className="text-gray-400">Phone:</span>{" "}
                          <a href={`tel:${job.contractorPhone}`} className="text-blue-600 hover:underline">
                            {job.contractorPhone}
                          </a>
                        </div>
                      )}
                      {job.contractorEmail && (
                        <div>
                          <span className="text-gray-400">Email:</span>{" "}
                          <a href={`mailto:${job.contractorEmail}`} className="text-blue-600 hover:underline">
                            {job.contractorEmail}
                          </a>
                        </div>
                      )}
                      {job.contractorWebsite && (
                        <div>
                          <span className="text-gray-400">Website:</span>{" "}
                          <a href={job.contractorWebsite.startsWith('http') ? job.contractorWebsite : `https://${job.contractorWebsite}`} 
                             target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {job.contractorWebsite}
                          </a>
                        </div>
                      )}
                      {(job.contractorAddress || job.contractorCity || job.contractorCounty) && (
                        <div>
                          <span className="text-gray-400">Address:</span>{" "}
                          <span className="font-medium">
                            {[job.contractorAddress, job.contractorCity, job.contractorCounty].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Owner Company:</span>{" "}
                    <span className="font-medium">{job.owner || "Not specified"}</span>
                  </div>
                  {job.ownerPhone && (
                    <div className="ml-4">
                      <span className="text-gray-400">Phone:</span>{" "}
                      <a href={`tel:${job.ownerPhone}`} className="text-blue-600 hover:underline">
                        {job.ownerPhone}
                      </a>
                    </div>
                  )}
                  {job.constructionManager && (
                    <div>
                      <span className="text-gray-500">Construction Manager:</span>{" "}
                      <span className="font-medium">{job.constructionManager}</span>
                      {job.constructionManagerPhone && (
                        <div className="ml-4">
                          <span className="text-gray-400">Phone:</span>{" "}
                          <a href={`tel:${job.constructionManagerPhone}`} className="text-blue-600 hover:underline">
                            {job.constructionManagerPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Architect:</span>{" "}
                    <span className="font-medium">{job.architect || "Not specified"}</span>
                  </div>
                  {job.officeContact && (
                    <div>
                      <span className="text-gray-500">GC Contact Name:</span>{" "}
                      <span className="font-medium">{job.officeContact}</span>
                    </div>
                  )}
                  {job.orderedBy && (
                    <div>
                      <span className="text-gray-500">Ordered By:</span>{" "}
                      <span className="font-medium">{job.orderedBy}</span>
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

          {/* Additional Project Info */}
          {(job.notes || job.specialConditions || job.userNotes || job.workType || job.deliverySystem || job.specsAvailable || job.projectUrl) && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Additional Information</h4>
                <div className="space-y-2 text-sm">
                  {job.workType && (
                    <div>
                      <span className="text-gray-500">Work Type:</span>{" "}
                      <span className="font-medium">{job.workType}</span>
                    </div>
                  )}
                  {job.deliverySystem && (
                    <div>
                      <span className="text-gray-500">Delivery System:</span>{" "}
                      <span className="font-medium">{job.deliverySystem}</span>
                    </div>
                  )}
                  {job.specsAvailable && (
                    <div>
                      <span className="text-gray-500">Specs Available:</span>{" "}
                      <span className="font-medium">{job.specsAvailable}</span>
                    </div>
                  )}
                  {job.projectUrl && (
                    <div>
                      <span className="text-gray-500">Project Link:</span>{" "}
                      <a href={job.projectUrl} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        View on Dodge Data
                      </a>
                    </div>
                  )}
                  {job.projectNumber && (
                    <div>
                      <span className="text-gray-500">Project Number:</span>{" "}
                      <span className="font-medium">{job.projectNumber}</span>
                    </div>
                  )}
                  {job.versionNumber && (
                    <div>
                      <span className="text-gray-500">Version:</span>{" "}
                      <span className="font-medium">{job.versionNumber}</span>
                    </div>
                  )}
                  {job.notes && (
                    <div>
                      <span className="text-gray-500">Tags:</span>{" "}
                      <span className="font-medium">{job.notes}</span>
                    </div>
                  )}
                  {job.userNotes && (
                    <div>
                      <span className="text-gray-500">Import Notes:</span>{" "}
                      <span className="font-medium">{job.userNotes}</span>
                    </div>
                  )}
                </div>
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
                    onBlur={() => handleSaveNotes()}
                    placeholder="Add your notes about this job..."
                    className="min-h-[100px]"
                    data-testid="notes-textarea"
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  {job.userNotes || "No notes added yet"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
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