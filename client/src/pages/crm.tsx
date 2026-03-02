import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useInteractions, useCrmOverview } from "@/hooks/useCRM";
import { useCompanies } from "@/hooks/useContacts";
import { ContactDetailModal } from "@/components/modals/ContactDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  ArrowLeft,
  Building2,
  Users,
  Activity,
  DollarSign,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
          )}
        </div>
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

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

const INTERACTION_TYPES = ["call", "email", "meeting", "site_visit", "text", "note"];
const DIRECTIONS = ["inbound", "outbound"];

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  // Activity log filters
  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState<string>("all");
  const [activityDirection, setActivityDirection] = useState<string>("all");
  const [activityCompanyId, setActivityCompanyId] = useState<string>("all");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");

  const { data: overview, isLoading: overviewLoading } = useCrmOverview();
  const { data: companies = [] } = useCompanies();

  const interactionFilters = useMemo(
    () => ({
      search: activitySearch || undefined,
      type: activityType !== "all" ? activityType : undefined,
      direction: activityDirection !== "all" ? activityDirection : undefined,
      companyId: activityCompanyId !== "all" ? activityCompanyId : undefined,
      startDate: activityStartDate || undefined,
      endDate: activityEndDate || undefined,
      limit: 200,
    }),
    [
      activitySearch,
      activityType,
      activityDirection,
      activityCompanyId,
      activityStartDate,
      activityEndDate,
    ]
  );

  const { data: interactions = [], isLoading: interactionsLoading } =
    useInteractions(interactionFilters);

  const handleOpenContact = (contactId: string | null) => {
    setSelectedContactId(contactId);
    setShowContactModal(true);
  };

  const followUpList = useMemo(() => {
    if (!overview?.companies) return [];
    const stale = overview.companies.filter(
      (c) => !c.lastInteractionAt || new Date(c.lastInteractionAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    return stale.sort((a, b) => {
      const aVal = a.pipelineValue || 0;
      const bVal = b.pipelineValue || 0;
      if (bVal !== aVal) return bVal - aVal;
      const aDate = a.lastInteractionAt ? new Date(a.lastInteractionAt).getTime() : 0;
      const bDate = b.lastInteractionAt ? new Date(b.lastInteractionAt).getTime() : 0;
      return aDate - bDate;
    });
  }, [overview?.companies]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <LayoutDashboard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">CRM Dashboard</h1>
                  <p className="text-xs text-gray-500">Sales activity, contacts, and companies</p>
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
              <Link href="/companies">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Companies
                </Button>
              </Link>
              <Link href="/kyc-import">
                <Button size="sm" className="gap-1.5">
                  Import Sales Log
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            label="Companies"
            value={overview?.totalCompanies?.toLocaleString() ?? "—"}
            icon={Building2}
            color="#3b82f6"
            loading={overviewLoading}
          />
          <KpiCard
            label="Contacts"
            value={overview?.totalContacts?.toLocaleString() ?? "—"}
            icon={Users}
            color="#8b5cf6"
            loading={overviewLoading}
          />
          <KpiCard
            label="Interactions"
            value={overview?.totalInteractions?.toLocaleString() ?? "—"}
            icon={Activity}
            color="#06b6d4"
            loading={overviewLoading}
          />
          <KpiCard
            label="This Month"
            value={overview?.interactionsThisMonth?.toLocaleString() ?? "—"}
            icon={Calendar}
            color="#22c55e"
            loading={overviewLoading}
          />
          <KpiCard
            label="Stale (30d+)"
            value={overview?.staleCount?.toLocaleString() ?? "—"}
            icon={AlertCircle}
            color="#f59e0b"
            loading={overviewLoading}
          />
          <KpiCard
            label="Pipeline"
            value={formatCurrency(overview?.totalPipelineValue ?? 0)}
            icon={DollarSign}
            color="#10b981"
            loading={overviewLoading}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="followup">Follow-Up Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search summary..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {INTERACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={activityDirection} onValueChange={setActivityDirection}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {DIRECTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={activityCompanyId} onValueChange={setActivityCompanyId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                  <Input
                    type="date"
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>

                {interactionsLoading ? (
                  <div className="py-12 text-center text-gray-500">Loading interactions...</div>
                ) : interactions.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No interactions found. Import a sales log or log activity from a contact.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Summary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interactions.map((i) => (
                          <TableRow
                            key={i.id}
                            className="cursor-pointer hover:bg-blue-50/50"
                            onClick={() => i.contactId && handleOpenContact(i.contactId)}
                          >
                            <TableCell className="text-sm text-gray-600">
                              {i.occurredAt ? format(new Date(i.occurredAt), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {i.type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize text-sm">{i.direction ?? "—"}</TableCell>
                            <TableCell className="font-medium">
                              {i.contactName || "—"}
                            </TableCell>
                            <TableCell className="text-gray-600">{i.companyName || "—"}</TableCell>
                            <TableCell className="max-w-xs truncate text-gray-600">
                              {i.summary || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            {overviewLoading ? (
              <div className="py-12 text-center text-gray-500">Loading companies...</div>
            ) : overview?.companies?.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h2>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Import contacts or a sales log to get started.
                  </p>
                  <Link href="/kyc-import">
                    <Button>Import Sales Log</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {overview?.companies?.map((company) => {
                  const isExpanded = expandedCompanyId === company.id;
                  return (
                    <Card key={company.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50"
                          onClick={() =>
                            setExpandedCompanyId(isExpanded ? null : company.id)
                          }
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {company.name}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                                <span>{company.contactCount} contacts</span>
                                <span>{company.interactionCount} interactions</span>
                                <span>{company.linkedJobCount} job sites</span>
                                {company.pipelineValue > 0 && (
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(company.pipelineValue)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {company.type && (
                                <Badge variant="outline" className="capitalize">
                                  {company.type}
                                </Badge>
                              )}
                              <LastInteractionBadge date={company.lastInteractionAt} />
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-gray-50/50 p-4 space-y-4">
                            {company.linkedJobs && company.linkedJobs.length > 0 && (
                              <div>
                                <div className="font-medium text-sm mb-2 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  Linked Job Sites
                                </div>
                                <div className="space-y-2">
                                  {company.linkedJobs.map((job) => (
                                    <Link key={job.id} href="/">
                                      <div className="text-sm p-2 rounded bg-white border hover:border-blue-200 cursor-pointer">
                                        <div className="font-medium">{job.name}</div>
                                        <div className="text-gray-500 truncate">{job.address}</div>
                                        <div className="flex gap-2 mt-1">
                                          {job.status && (
                                            <Badge variant="secondary" className="text-xs">
                                              {job.status}
                                            </Badge>
                                          )}
                                          {job.temperature && (
                                            <Badge variant="outline" className="text-xs">
                                              {job.temperature}
                                            </Badge>
                                          )}
                                          {job.projectValue && (
                                            <span className="text-xs text-green-600">
                                              {formatCurrency(parseFloat(String(job.projectValue)))}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Link href={`/companies/${company.id}`}>
                                <Button size="sm" variant="outline">
                                  View Company
                                </Button>
                              </Link>
                              <Link href="/contacts">
                                <Button size="sm" variant="outline">
                                  View Contacts
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followup" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-4">
                  Companies with no interaction in the last 30 days, sorted by pipeline value.
                </p>
                {followUpList.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No stale relationships. Great job staying in touch!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {followUpList.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-white hover:border-blue-200 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {company.contactCount} contacts · {company.linkedJobCount} job sites
                            {company.pipelineValue > 0 && (
                              <span className="ml-2 font-medium text-green-600">
                                {formatCurrency(company.pipelineValue)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <LastInteractionBadge date={company.lastInteractionAt} />
                          <Link href={`/companies/${company.id}`}>
                            <Button size="sm">View & Log</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ContactDetailModal
        contactId={selectedContactId}
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setSelectedContactId(null);
        }}
      />
    </div>
  );
}
