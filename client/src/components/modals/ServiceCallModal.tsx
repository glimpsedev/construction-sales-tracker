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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { Copy } from "lucide-react";
import type { RentalEquipment } from "@shared/schema";

interface ServiceCallModalProps {
  equipment: RentalEquipment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceCallModal({ equipment, isOpen, onClose }: ServiceCallModalProps) {
  const [issue, setIssue] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [markAsNeedingService, setMarkAsNeedingService] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setIssue("");
      setContactName("");
      setContactPhone("");
      setMarkAsNeedingService(false);
      setCopied(false);
    }
  }, [isOpen]);

  const customerName = equipment?.customerOnRent ?? equipment?.customer ?? "Unknown";

  const buildMessage = () => {
    if (!equipment) return "";
    const lines: string[] = [
      customerName,
      `${equipment.model} (${equipment.equipmentNumber})`,
      `Issue: ${issue || "(describe issue)"}`,
    ];
    if (contactName || contactPhone) {
      const contact = [contactName, contactPhone].filter(Boolean).join(" ");
      lines.push(`Contact: ${contact}`);
    }
    lines.push("Location:");
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const message = buildMessage();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Paste the message into your text chain.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy to clipboard.",
      });
    }
  };

  const handleMarkAsNeedingService = async () => {
    if (!equipment) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rental-equipment/${equipment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: "maintenance" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      toast({
        title: "Marked as needing service",
        description: `${equipment.equipmentNumber} has been marked for maintenance.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Service Call</DialogTitle>
          <DialogDescription>
            Enter the issue and generate a message to copy into the JSC NW SERVICE text chain.
          </DialogDescription>
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

            <div>
              <Label htmlFor="issue" className="text-sm mb-2 block">
                Issue
              </Label>
              <Textarea
                id="issue"
                placeholder="Describe the issue (e.g. Coupler will not release the grapple...)"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName" className="text-sm mb-2 block">
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  placeholder="Christian"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" className="text-sm mb-2 block">
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  placeholder="(925) 491-1514"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="markAsNeedingService"
                checked={markAsNeedingService}
                onCheckedChange={(checked) => setMarkAsNeedingService(checked === true)}
              />
              <Label
                htmlFor="markAsNeedingService"
                className="text-sm font-normal cursor-pointer"
              >
                Mark as needing service
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy message"}
          </Button>
          {markAsNeedingService && (
            <Button onClick={handleMarkAsNeedingService} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Mark as needing service"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
