import { useMemo } from "react";
import { useJobStats, useDetailedStats } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Eye,
  TrendingUp,
  MapPin,
  Flame,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const TEMP_COLORS: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f97316",
  cold: "#6b7280",
  green: "#22c55e",
  unvisited: "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#3b82f6",
  planning: "#f59e0b",
  completed: "#22c55e",
  pending: "#8b5cf6",
};

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
  subtitle,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
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
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
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

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm ${className || ""}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 text-sm">
      <p className="font-medium text-gray-900">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-xs mt-0.5">
          {entry.name}: {typeof entry.value === "number" && entry.value > 10000
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useJobStats();
  const { data: detailed, isLoading: detailedLoading } = useDetailedStats();
  const loading = statsLoading || detailedLoading;

  const visitRate = useMemo(() => {
    if (!detailed?.visitCoverage) return 0;
    return detailed.visitCoverage.rate;
  }, [detailed]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-[60px]">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  Map
                </Button>
              </Link>
              <div className="w-px h-6 bg-gray-200" />
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Jobs"
            value={stats?.totalJobs?.toLocaleString() ?? "—"}
            icon={Briefcase}
            color="#3b82f6"
            loading={loading}
          />
          <KpiCard
            label="Pipeline Value"
            value={stats?.totalValue ? formatCurrency(stats.totalValue) : "—"}
            icon={DollarSign}
            color="#22c55e"
            loading={loading}
          />
          <KpiCard
            label="Visit Rate"
            value={`${visitRate}%`}
            icon={Eye}
            color="#8b5cf6"
            subtitle={detailed ? `${detailed.visitCoverage.visited} of ${detailed.visitCoverage.visited + detailed.visitCoverage.unvisited}` : undefined}
            loading={loading}
          />
          <KpiCard
            label="Active Jobs"
            value={stats?.activeJobs?.toLocaleString() ?? "—"}
            icon={TrendingUp}
            color="#f59e0b"
            loading={loading}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Jobs by County */}
          <ChartCard title="Jobs by County (Top 15)">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={detailed?.jobsByCounty ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Jobs" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Temperature Distribution */}
          <ChartCard title="Temperature Distribution">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : (
              <div className="flex items-center">
                <ResponsiveContainer width="60%" height={300}>
                  <PieChart>
                    <Pie
                      data={detailed?.jobsByTemperature?.filter((d: any) => d.count > 0) ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                    >
                      {(detailed?.jobsByTemperature ?? []).filter((d: any) => d.count > 0).map((entry: any) => (
                        <Cell key={entry.name} fill={TEMP_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3 pl-2">
                  {(detailed?.jobsByTemperature ?? []).filter((d: any) => d.count > 0).map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TEMP_COLORS[entry.name] || "#94a3b8" }}
                      />
                      <span className="text-sm text-gray-600 capitalize">{entry.name}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-auto">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Jobs Over Time */}
          <ChartCard title="Jobs Added Over Time">
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={detailed?.monthlyJobs ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Jobs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Pipeline Value by Status */}
          <ChartCard title="Pipeline Value by Status">
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={detailed?.pipelineByStatus?.filter((d: any) => d.value > 0) ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Pipeline Value" radius={[4, 4, 0, 0]} barSize={48}>
                    {(detailed?.pipelineByStatus ?? []).filter((d: any) => d.value > 0).map((entry: any) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Visit Coverage */}
          <ChartCard title="Visit Coverage">
            {loading ? (
              <Skeleton className="h-[160px] w-full rounded-lg" />
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Visited</span>
                    <span className="text-sm font-semibold text-gray-900">{visitRate}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                      style={{ width: `${visitRate}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{detailed?.visitCoverage?.visited ?? 0}</p>
                    <p className="text-xs text-blue-500 mt-0.5">Visited</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">{detailed?.visitCoverage?.unvisited ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Unvisited</p>
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Top Contractors */}
          <ChartCard title="Top Contractors">
            {loading ? (
              <Skeleton className="h-[160px] w-full rounded-lg" />
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {(detailed?.topContractors ?? []).map((contractor: any, i: number) => (
                  <div key={contractor.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{contractor.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{contractor.count}</span>
                  </div>
                ))}
                {(!detailed?.topContractors || detailed.topContractors.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No contractor data</p>
                )}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
