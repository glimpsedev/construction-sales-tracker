import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { format } from "date-fns";
import type { RentalEquipment } from "@shared/schema";

interface DownDayModalProps {
  equipment: RentalEquipment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DownDayModal({ equipment, isOpen, onClose }: DownDayModalProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSelectedDates([]);
      setReason("");
    }
  }, [isOpen]);

  const handleSubmit = async (sendEmail: boolean) => {
    if (!equipment) return;
    if (selectedDates.length === 0) {
      toast({
        variant: "destructive",
        title: "Select dates",
        description: "Please select at least one down date.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
      const res = await fetch(`/api/rental-equipment/${equipment.id}/down-day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ dates, reason, sendEmail }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate form");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DownDayForm-${equipment.equipmentNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: sendEmail ? "Sent & downloaded" : "Downloaded",
        description: sendEmail
          ? "Down Day Form was emailed to DownDays@jscole.com and downloaded."
          : "Down Day Form was downloaded.",
      });
      onClose();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate form",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = equipment?.customerOnRent ?? equipment?.customer ?? "Unknown";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Down Day</DialogTitle>
          <DialogDescription>Select down dates and enter a reason to generate the Down Day Form.</DialogDescription>
        </DialogHeader>

        {equipment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Equipment #</Label>
                <p className="font-mono font-semibold text-gray-900">{equipment.equipmentNumber}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Customer</Label>
                <p className="font-medium text-gray-900 truncate">{customerName}</p>
              </div>
            </div>

            <div className="pointer-events-auto">
              <Label className="text-sm mb-2 block">Down Date/s</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates ?? [])}
                className="rounded-md border"
              />
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm mb-2 block">
                Reason For Down Day
              </Label>
              <Textarea
                id="reason"
                placeholder="Describe the reason for the down day..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            Download PDF
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Send & Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
