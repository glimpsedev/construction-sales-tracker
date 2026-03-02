import { useState } from "react";
import { Link } from "wouter";
import { useContacts } from "@/hooks/useContacts";
import { ContactDetailModal } from "@/components/modals/ContactDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Upload, MapPin, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function LastInteractionBadge({ date }: { date: Date | string | null }) {
  if (!date) return <span className="text-xs text-gray-400">No contact</span>;
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  const color =
    days < 7 ? "text-green-600" : days < 30 ? "text-yellow-600" : "text-red-600";
  return (
    <span className={`text-xs ${color}`}>
      {days < 1 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}
    </span>
  );
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: contacts = [], isLoading } = useContacts({ search: search || undefined });

  const handleSelectContact = (id: string) => {
    setSelectedContactId(id);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Contacts</h1>
                  <p className="text-xs text-gray-500">Manage your contacts and companies</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/contact-import">
                <Button size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  Import VCF
                </Button>
              </Link>
              <Link href="/companies">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Companies
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search contacts by name, company, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Import your contacts from a VCF file or add them manually to get started.
              </p>
              <Link href="/contact-import">
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import from VCF
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {contacts.map((contact) => (
              <Card
                key={contact.id}
                className="cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                onClick={() => handleSelectContact(contact.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{contact.fullName || `${contact.firstName} ${contact.lastName}`.trim() || "Unknown"}</div>
                      {contact.title && (
                        <div className="text-sm text-gray-500 truncate">{contact.title}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        {contact.phonePrimary && (
                          <span className="truncate">{contact.phonePrimary}</span>
                        )}
                        {contact.emailPrimary && (
                          <span className="truncate">{contact.emailPrimary}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <LastInteractionBadge date={contact.lastInteractionAt} />
                      {contact.tags && contact.tags.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.tags[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ContactDetailModal
        contactId={selectedContactId}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedContactId(null);
        }}
      />
    </div>
  );
}
