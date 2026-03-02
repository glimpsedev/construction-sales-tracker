import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Building2, MapPin, Calendar, FileText } from "lucide-react";
import { Link } from "wouter";
import { useContact, useLogInteraction } from "@/hooks/useContacts";
import { LogInteractionModal } from "./LogInteractionModal";
import { formatDistanceToNow } from "date-fns";

interface ContactDetailModalProps {
  contactId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function LastInteractionBadge({ date }: { date: Date | string | null }) {
  if (!date) return <Badge variant="secondary">No contact yet</Badge>;
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  const color =
    days < 7 ? "bg-green-100 text-green-800" : days < 30 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return (
    <Badge variant="secondary" className={color}>
      {days < 1 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`}
    </Badge>
  );
}

export function ContactDetailModal({ contactId, isOpen, onClose }: ContactDetailModalProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const { data: contact, isLoading } = useContact(contactId);
  const logMutation = useLogInteraction(contactId);

  const handleLogInteraction = (data: { type: string; direction?: string; summary?: string; notes?: string }) => {
    logMutation.mutate(data, {
      onSuccess: () => setShowLogModal(false),
    });
  };

  const phone = contact?.phonePrimary || contact?.phoneCell || contact?.phoneWork;
  const email = contact?.emailPrimary || contact?.emailSecondary;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contact?.fullName || "Contact"}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : contact ? (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {phone && (
                  <Button size="sm" asChild>
                    <a href={`tel:${phone}`}>
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      Call
                    </a>
                  </Button>
                )}
                {email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${email}`}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Email
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setShowLogModal(true)}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Log Interaction
                </Button>
              </div>

              {/* Last Interaction */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Last contact:</span>
                <LastInteractionBadge date={contact.lastInteractionAt} />
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                {contact.title && (
                  <div className="text-gray-600">{contact.title}</div>
                )}
                {contact.companyId && contact.company && (
                  <Link href={`/companies/${contact.company.id}`}>
                    <button className="flex items-center gap-2 text-blue-600 hover:underline">
                      <Building2 className="h-4 w-4" />
                      {contact.company.name}
                    </button>
                  </Link>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${phone}`} className="text-gray-700 hover:text-blue-600">
                      {phone}
                    </a>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${email}`} className="text-gray-700 hover:text-blue-600">
                      {email}
                    </a>
                  </div>
                )}
                {(contact.address || contact.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {[contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Assigned Jobs */}
              {contact.jobs && contact.jobs.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="font-medium text-sm mb-2">Assigned Jobs</div>
                    <div className="space-y-1">
                      {contact.jobs.map((cj) => (
                        <Link key={cj.id} href="/">
                          <button className="block w-full text-left text-sm text-blue-600 hover:underline py-1">
                            {cj.job?.name} ({cj.role})
                          </button>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Interaction Timeline */}
              {contact.interactions && contact.interactions.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="font-medium text-sm mb-2">Recent Activity</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {contact.interactions.slice(0, 10).map((i) => (
                        <div key={i.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                          <div className="font-medium capitalize">{i.type}</div>
                          {i.summary && <div className="text-gray-600">{i.summary}</div>}
                          <div className="text-xs text-gray-400">
                            {i.occurredAt && formatDistanceToNow(new Date(i.occurredAt), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {contact.notes && (
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">Notes</div>
                  <p className="text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Contact not found</div>
          )}
        </DialogContent>
      </Dialog>

      <LogInteractionModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        contactName={contact?.fullName || ""}
        onSubmit={handleLogInteraction}
        isPending={logMutation.isPending}
      />
    </>
  );
}
