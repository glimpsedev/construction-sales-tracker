import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { DEFAULT_FILTER_PREFERENCES, type FilterPreferences, type FilterPreference } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Save } from "lucide-react";

interface FilterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPreferencesModal({ isOpen, onClose }: FilterPreferencesModalProps) {
  const { preferences, isLoading, updatePreferencesAsync, isUpdating, refetch } = useFilterPreferences();
  const { toast } = useToast();
  const [localPreferences, setLocalPreferences] = useState<FilterPreferences>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newFilterKey, setNewFilterKey] = useState("");
  const [newFilter, setNewFilter] = useState<FilterPreference>({ name: "", icon: "", color: "#6b7280" });

  // Initialize local preferences when modal opens or preferences load
  // Also refetch preferences when modal opens to ensure we have the latest data
  useEffect(() => {
    if (isOpen) {
      refetch?.();
      if (preferences) {
        setLocalPreferences({ ...preferences });
      }
    }
  }, [isOpen, preferences, refetch]);

  const handleSave = async () => {
    try {
      await updatePreferencesAsync(localPreferences);
      toast({
        title: "Success",
        description: "Filter preferences saved successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const handleUpdateFilter = (key: string, updates: Partial<FilterPreference>) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  const handleDeleteFilter = (key: string) => {
    // Don't allow deleting default filters
    if (DEFAULT_FILTER_PREFERENCES[key]) {
      toast({
        title: "Cannot Delete",
        description: "Default filters cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    const newPrefs = { ...localPreferences };
    delete newPrefs[key];
    setLocalPreferences(newPrefs);
  };

  const handleAddFilter = () => {
    if (!newFilterKey.trim()) {
      toast({
        title: "Error",
        description: "Filter key is required",
        variant: "destructive",
      });
      return;
    }

    if (localPreferences[newFilterKey]) {
      toast({
        title: "Error",
        description: "A filter with this key already exists",
        variant: "destructive",
      });
      return;
    }

    if (!newFilter.name.trim()) {
      toast({
        title: "Error",
        description: "Filter name is required",
        variant: "destructive",
      });
      return;
    }

    setLocalPreferences((prev) => ({
      ...prev,
      [newFilterKey]: { ...newFilter },
    }));

    // Reset form
    setNewFilterKey("");
    setNewFilter({ name: "", icon: "", color: "#6b7280" });
  };

  const handleResetToDefaults = () => {
    setLocalPreferences({ ...DEFAULT_FILTER_PREFERENCES });
  };

  const isDefaultFilter = (key: string) => !!DEFAULT_FILTER_PREFERENCES[key];

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Preferences</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Filter Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Filters */}
          <div>
            <h3 className="text-sm font-medium mb-3">Existing Filters</h3>
            <div className="space-y-4">
              {Object.entries(localPreferences).map(([key, filter]) => (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{filter.name}</span>
                      <span className="text-xs text-gray-500">({key})</span>
                    </div>
                    {!isDefaultFilter(key) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFilter(key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`name-${key}`}>Name</Label>
                      <Input
                        id={`name-${key}`}
                        value={filter.name}
                        onChange={(e) => handleUpdateFilter(key, { name: e.target.value })}
                        placeholder="Filter name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`color-${key}`}>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`color-${key}`}
                          type="color"
                          value={filter.color}
                          onChange={(e) => handleUpdateFilter(key, { color: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={filter.color}
                          onChange={(e) => handleUpdateFilter(key, { color: e.target.value })}
                          placeholder="#ef4444"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Filter */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Add New Filter</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-filter-key">Filter Key (unique identifier)</Label>
                <Input
                  id="new-filter-key"
                  value={newFilterKey}
                  onChange={(e) => setNewFilterKey(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                  placeholder="e.g., urgent, follow-up"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, hyphens, and underscores only</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-filter-name">Name</Label>
                  <Input
                    id="new-filter-name"
                    value={newFilter.name}
                    onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                    placeholder="Filter name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-filter-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-filter-color"
                      type="color"
                      value={newFilter.color}
                      onChange={(e) => setNewFilter({ ...newFilter, color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={newFilter.color}
                      onChange={(e) => setNewFilter({ ...newFilter, color: e.target.value })}
                      placeholder="#ef4444"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddFilter} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
