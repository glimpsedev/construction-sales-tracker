import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DEFAULT_FILTER_PREFERENCES, type FilterPreferences } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Merges user filter preferences with defaults to ensure consistent temperature options
 * across FilterSidebar and JobDetailsModal components.
 */
export function getMergedFilterPreferences(userPreferences?: FilterPreferences | null): FilterPreferences {
  return { ...DEFAULT_FILTER_PREFERENCES, ...(userPreferences || {}) }
}
