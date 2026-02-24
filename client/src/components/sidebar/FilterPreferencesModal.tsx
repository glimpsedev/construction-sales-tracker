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
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { DEFAULT_FILTER_PREFERENCES, type FilterPreferences, type FilterPreference } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, GripVertical, RotateCcw, Pencil, Check, X } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#6b7280", "#000000", "#78716c",
];

function generateKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface FilterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPreferencesModal({ isOpen, onClose }: FilterPreferencesModalProps) {
  const { preferences, isLoading, updatePreferencesAsync, isUpdating, refetch } = useFilterPreferences();
  const { toast } = useToast();
  const [localPreferences, setLocalPreferences] = useState<FilterPreferences>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  useEffect(() => {
    if (isOpen) {
      refetch?.();
      if (preferences) {
        setLocalPreferences({ ...preferences });
      }
      setEditingKey(null);
      setIsAdding(false);
      setNewName("");
      setNewColor("#3b82f6");
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

  const handleStartEdit = (key: string) => {
    setEditingKey(key);
    setEditName(localPreferences[key].name);
  };

  const handleConfirmEdit = (key: string) => {
    if (editName.trim()) {
      setLocalPreferences((prev) => ({
        ...prev,
        [key]: { ...prev[key], name: editName.trim() },
      }));
    }
    setEditingKey(null);
  };

  const handleColorChange = (key: string, color: string) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: { ...prev[key], color },
    }));
  };

  const handleDeleteFilter = (key: string) => {
    if (DEFAULT_FILTER_PREFERENCES[key]) {
      toast({
        title: "Cannot Delete",
        description: "Default filters cannot be removed",
        variant: "destructive",
      });
      return;
    }
    const newPrefs = { ...localPreferences };
    delete newPrefs[key];
    setLocalPreferences(newPrefs);
  };

  const handleAddFilter = () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Enter a filter name", variant: "destructive" });
      return;
    }

    const key = generateKey(newName);
    if (!key) {
      toast({ title: "Error", description: "Name must contain at least one letter or number", variant: "destructive" });
      return;
    }

    if (localPreferences[key]) {
      toast({ title: "Error", description: "A filter with a similar name already exists", variant: "destructive" });
      return;
    }

    setLocalPreferences((prev) => ({
      ...prev,
      [key]: { name: newName.trim(), icon: "", color: newColor },
    }));
    setNewName("");
    setNewColor("#3b82f6");
    setIsAdding(false);
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
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Filters</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Customize filter names and colors used to categorize jobs.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-2">
          {Object.entries(localPreferences).map(([key, filter]) => (
            <div
              key={key}
              className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <ColorDot
                color={filter.color}
                presets={PRESET_COLORS}
                onChange={(c) => handleColorChange(key, c)}
              />

              {editingKey === key ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmEdit(key);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleConfirmEdit(key)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditingKey(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className="flex-1 text-sm font-medium cursor-pointer"
                    onClick={() => handleStartEdit(key)}
                  >
                    {filter.name}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleStartEdit(key)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {!isDefaultFilter(key) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteFilter(key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Filter name"
                className="h-9"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFilter();
                  if (e.key === "Escape") { setIsAdding(false); setNewName(""); }
                }}
              />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Pick a color</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newColor === c
                          ? "border-primary scale-110 shadow-sm"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddFilter}>
                  Add Filter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setIsAdding(false); setNewName(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4" />
              Add new filter
            </button>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between border-t pt-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToDefaults}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColorDot({
  color,
  presets,
  onChange,
}: {
  color: string;
  presets: string[];
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="w-8 h-8 rounded-full border-2 border-background shadow-sm ring-1 ring-border shrink-0 transition-transform hover:scale-110"
        style={{ backgroundColor: color }}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-popover border rounded-lg shadow-lg p-3 w-[200px]">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((c) => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c
                      ? "border-primary scale-110 shadow-sm"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => { onChange(c); setOpen(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <Input
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
