import { cn } from "@/lib/utils";

interface MapContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MapContainer({ children, className }: MapContainerProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        // Background pattern to match design
        "map-container bg-blue-50",
        className
      )}
      style={{
        background: `
          linear-gradient(45deg, #e3f2fd 25%, transparent 25%), 
          linear-gradient(-45deg, #e3f2fd 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #e3f2fd 75%), 
          linear-gradient(-45deg, transparent 75%, #e3f2fd 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}
      data-testid="map-container"
    >
      {children}
    </div>
  );
}
