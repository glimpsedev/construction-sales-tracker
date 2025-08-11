import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

export function GeocodeButton() {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();

  const geocodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/geocode-missing', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to geocode');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Geocoding Complete",
        description: data.message
      });
      setIsGeocoding(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to geocode addresses"
      });
      setIsGeocoding(false);
    }
  });

  const handleGeocode = () => {
    setIsGeocoding(true);
    geocodeMutation.mutate();
  };

  return (
    <Button
      onClick={handleGeocode}
      disabled={isGeocoding || geocodeMutation.isPending}
      data-testid="geocode-button"
    >
      <MapPin className="h-4 w-4 mr-2" />
      {isGeocoding || geocodeMutation.isPending ? "Geocoding..." : "Geocode Missing Addresses"}
    </Button>
  );
}