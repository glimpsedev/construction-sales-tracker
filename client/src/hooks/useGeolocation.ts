import { useState, useCallback } from "react";
import { useToast } from "./use-toast";

interface GeolocationPosition {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getCurrentLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser";
      setError(errorMsg);
      toast({
        title: "Location Error",
        description: errorMsg,
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: GeolocationPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(pos);
          setIsLoading(false);
          resolve(pos);
        },
        (error) => {
          let errorMsg = "Unable to retrieve your location";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMsg = "Location request timed out";
              break;
          }
          
          setError(errorMsg);
          setIsLoading(false);
          toast({
            title: "Location Error",
            description: errorMsg,
            variant: "destructive"
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, [toast]);

  const watchLocation = useCallback((callback: (position: GeolocationPosition) => void) => {
    if (!navigator.geolocation) {
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const pos: GeolocationPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(pos);
        callback(pos);
      },
      (error) => {
        console.error("Geolocation watch error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000
      }
    );
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    watchLocation
  };
}
