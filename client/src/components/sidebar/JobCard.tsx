import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Job } from "@shared/schema";

interface JobCardProps {
  job: Job;
  onClick: () => void;
}

export default function JobCard({ job, onClick }: JobCardProps) {
  // Determine the effective status based on target start date
  const getEffectiveStatus = (job: Job) => {
    if (job.status === 'completed') return 'completed'; // Don't change completed status
    
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If start date has passed and job is in planning, mark as active
      if (startDate <= today && job.status === 'planning') {
        return 'active';
      }
    }
    
    return job.status;
  };

  const effectiveStatus = getEffectiveStatus(job);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-secondary/20 text-secondary';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'fas fa-check-circle';
      case 'active': return 'fas fa-hammer';
      case 'planning': return 'fas fa-clock';
      case 'pending': return 'fas fa-pause';
      default: return 'fas fa-map-marker-alt';
    }
  };

  const formatValue = (value?: string) => {
    if (!value) return null;
    const numValue = parseFloat(value);
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(0)}K`;
    }
    return `$${numValue.toLocaleString()}`;
  };

  const truncateAddress = (address: string, maxLength: number = 40) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="job-card bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-darktext mb-1 truncate" title={job.name}>
            {job.name}
          </h4>
          <p 
            className="text-xs text-gray-500 font-mono mb-2 truncate" 
            title={job.address}
          >
            {truncateAddress(job.address)}
          </p>
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <Badge className={`text-xs ${getStatusColor(effectiveStatus)}`}>
              {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
            </Badge>
            {job.projectValue && (
              <span className="text-xs text-gray-500" data-testid={`job-value-${job.id}`}>
                {formatValue(job.projectValue)}
              </span>
            )}
            {job.type && (
              <Badge variant="outline" className="text-xs">
                {job.type}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`text-gray-400 hover:text-primary flex-shrink-0 ml-2 ${
            effectiveStatus === 'completed' ? 'text-secondary' : ''
          }`}
          data-testid={`button-select-job-${job.id}`}
        >
          <i className={getStatusIcon(effectiveStatus)}></i>
        </Button>
      </div>
      
      {job.contractor && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600 truncate" title={job.contractor}>
            <i className="fas fa-hard-hat mr-1"></i>
            {job.contractor}
          </p>
        </div>
      )}
      
      {job.isCustom && (
        <div className="mt-1">
          <Badge variant="secondary" className="text-xs">
            <i className="fas fa-user mr-1"></i>
            Custom
          </Badge>
        </div>
      )}
    </div>
  );
}
