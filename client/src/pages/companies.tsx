import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useCompanies, useCompany } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Building2, Phone, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function LastInteractionBadge({ date }: { date: Date | string | null }) {
  if (!date) return <span className="text-xs text-gray-400">No contact</span>;
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  const color = days < 7 ? "text-green-600" : days < 30 ? "text-yellow-600" : "text-red-600";
  return (
    <span className={`text-xs ${color}`}>
      {days < 1 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}
    </span>
  );
}

function CompanyDetail() {
  const [, params] = useRoute("/companies/:id");
  const id = params?.id ?? null;
  const { data: company, isLoading } = useCompany(id);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{company?.name || "Company"}</h1>
          <p className="text-sm text-gray-500">Company details</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : company ? (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Last contact:</span>
              <LastInteractionBadge date={company.lastInteractionAt} />
            </div>

            <div className="space-y-2 text-sm">
              {company.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">
                    {company.phone}
                  </a>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                    {company.email}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {[company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")}
                </div>
              )}
            </div>

            {company.contacts && company.contacts.length > 0 && (
              <div>
                <div className="font-medium text-sm mb-2">Contacts ({company.contacts.length})</div>
                <div className="space-y-2">
                  {company.contacts.map((c) => (
                    <Link key={c.id} href="/contacts">
                      <button className="block w-full text-left text-sm text-blue-600 hover:underline py-1">
                        {c.fullName || `${c.firstName} ${c.lastName}`.trim() || "Unknown"}{" "}
                        {c.title && `- ${c.title}`}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {company.interactions && company.interactions.length > 0 && (
              <div>
                <div className="font-medium text-sm mb-2">Recent Activity</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {company.interactions.slice(0, 10).map((i) => (
                    <div key={i.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                      <div className="font-medium capitalize">{i.type}</div>
                      {i.summary && <div className="text-gray-600">{i.summary}</div>}
                      <div className="text-xs text-gray-400">
                        {i.occurredAt && formatDistanceToNow(new Date(i.occurredAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {company.notes && (
              <div className="text-sm">
                <div className="font-medium text-gray-700 mb-1">Notes</div>
                <p className="text-gray-600 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="py-12 text-center text-gray-500">Company not found</div>
      )}
    </div>
  );
}

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [, params] = useRoute("/companies/:id");
  const isDetailView = !!params?.id;

  const { data: companies = [], isLoading } = useCompanies({ search: search || undefined });

  if (isDetailView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CompanyDetail />
        </div>
      </div>
    );
  }

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
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Companies</h1>
                  <p className="text-xs text-gray-500">Manage your companies</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/contacts">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  Contacts
                </Button>
              </Link>
              <Link href="/contact-import">
                <Button size="sm" className="gap-1.5">
                  Import VCF
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
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading companies...</div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Companies are created when you import contacts from a VCF file.
              </p>
              <Link href="/contact-import">
                <Button>Import from VCF</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {companies.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`}>
                <Card className="cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{company.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          {company.phone && <span>{company.phone}</span>}
                          {company.email && <span className="truncate">{company.email}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <LastInteractionBadge date={company.lastInteractionAt} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
