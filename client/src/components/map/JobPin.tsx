import { cn } from "@/lib/utils";
import type { Job } from "@shared/schema";

interface JobPinProps {
  job: Job;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function JobPin({ job, isSelected, onClick, className }: JobPinProps) {
  const getStatusColor = () => {
    switch (job.status) {
      case 'active': return 'bg-primary';
      case 'completed': return 'bg-secondary';
      case 'planning': return 'bg-accent';
      case 'pending': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (job.type === 'equipment') return 'fas fa-cog';
    
    switch (job.status) {
      case 'active': return 'fas fa-hammer';
      case 'completed': return 'fas fa-check';
      case 'planning': return 'fas fa-clock';
      case 'pending': return 'fas fa-pause';
      default: return 'fas fa-map-marker-alt';
    }
  };

  const formatValue = (value?: string) => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(0)}K`;
    }
    return `$${numValue.toLocaleString()}`;
  };

  return (
    <div 
      className={cn(
        "pin-drop absolute cursor-pointer",
        isSelected && "z-20",
        className
      )}
      onClick={onClick}
      data-testid={`job-pin-${job.id}`}
    >
      <div className="relative">
        <div className={cn(
          "w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-200",
          getStatusColor(),
          isSelected && "scale-125 ring-2 ring-blue-300"
        )}>
          <i className={cn(getStatusIcon(), "text-white text-xs")}></i>
        </div>
        
        {/* Tooltip */}
        <div className={cn(
          "absolute top-8 left-1/2 transform -translate-x-1/2 bg-darktext text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-opacity duration-200",
          "opacity-0 pointer-events-none",
          "group-hover:opacity-100"
        )}>
          {job.name}
          {job.projectValue && ` - ${formatValue(job.projectValue)}`}
        </div>
      </div>
    </div>
  );
}
