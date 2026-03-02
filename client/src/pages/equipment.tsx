import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { RentalEquipment } from "@shared/schema";
import { Link } from "wouter";
import { Calendar } from "lucide-react";
import { DownDayModal } from "@/components/modals/DownDayModal";

export default function Equipment() {
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [downDayEquipment, setDownDayEquipment] = useState<RentalEquipment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: equipment = [],
    isLoading,
    error,
  } = useQuery<RentalEquipment[]>({
    queryKey: ["/api/rental-equipment"],
  });

  const processEmailMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/process-equipment-email", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to process equipment file");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${data.count} equipment records processed`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not process the equipment file. Check the format.",
      });
    },
  });

  const handleFileSelect = (f: File | null) => {
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped ?? null);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return equipment;
    const q = search.toLowerCase();
    return equipment.filter(
      (e) =>
        e.equipmentNumber.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q) ||
        (e.customerOnRent ?? "").toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q)
    );
  }, [equipment, search]);

  const stats = useMemo(() => {
    const customers = new Set(equipment.map((e) => e.customerOnRent).filter(Boolean));
    const totalRate = equipment.reduce((sum, e) => sum + (e.monthlyRate ?? 0), 0);
    const daysArr = equipment.map((e) => e.daysOnOffRent).filter((d): d is number => d != null);
    const avgDays = daysArr.length ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0;
    return {
      total: equipment.length,
      customers: customers.size,
      totalRate,
      avgDays,
    };
  }, [equipment]);

  const customerColors: Record<string, string> = {};
  const palette = [
    "bg-blue-50 border-blue-200",
    "bg-emerald-50 border-emerald-200",
    "bg-violet-50 border-violet-200",
    "bg-amber-50 border-amber-200",
    "bg-rose-50 border-rose-200",
    "bg-cyan-50 border-cyan-200",
    "bg-fuchsia-50 border-fuchsia-200",
    "bg-lime-50 border-lime-200",
  ];
  const badgePalette = [
    "bg-blue-100 text-blue-800",
    "bg-emerald-100 text-emerald-800",
    "bg-violet-100 text-violet-800",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-800",
    "bg-cyan-100 text-cyan-800",
    "bg-fuchsia-100 text-fuchsia-800",
    "bg-lime-100 text-lime-800",
  ];
  let colorIdx = 0;
  equipment.forEach((e) => {
    const c = e.customerOnRent ?? "Unknown";
    if (!customerColors[c]) {
      customerColors[c] = palette[colorIdx % palette.length];
      colorIdx++;
    }
  });
  function badgeColor(customer: string): string {
    const names = Object.keys(customerColors);
    const idx = names.indexOf(customer);
    return idx >= 0 ? badgePalette[idx % badgePalette.length] : "bg-gray-100 text-gray-800";
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
            <p className="text-gray-500">Could not load equipment data. Try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Top bar */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Equipment Tracker</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Hudson's On-Rent Fleet</p>
            </div>
          </div>
          {equipment.length > 0 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-sm px-3 py-1">
              {equipment.length} Active
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload card */}
        <Card className="overflow-hidden border-dashed border-2 border-gray-200 hover:border-blue-300 transition-colors">
          <CardContent className="p-0">
            <div
              className={`p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "bg-blue-50 border-blue-400"
                  : "bg-white hover:bg-gray-50/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                data-testid="file-input"
              />

              {file ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      processEmailMutation.mutate(file);
                    }}
                    disabled={processEmailMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="upload-button"
                  >
                    {processEmailMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Processing...
                      </>
                    ) : (
                      "Upload & Process"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Drop equipment status file here</p>
                    <p className="text-sm text-gray-400">or click to browse (.xlsx)</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        {equipment.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pieces on Rent"
              value={stats.total.toString()}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
              color="blue"
            />
            <StatCard
              label="Customers"
              value={stats.customers.toString()}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              color="violet"
            />
            <StatCard
              label="Monthly Revenue"
              value={`$${stats.totalRate.toLocaleString()}`}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              color="emerald"
            />
            <StatCard
              label="Avg Days on Rent"
              value={stats.avgDays.toString()}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              color="amber"
            />
          </div>
        )}

        {/* Equipment table */}
        {isLoading ? (
          <Card>
            <CardContent className="py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-500">Loading equipment...</p>
              </div>
            </CardContent>
          </Card>
        ) : equipment.length === 0 ? (
          <Card>
            <CardContent className="py-20">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">No Equipment Data Yet</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-sm">
                    Upload your daily equipment status spreadsheet above to see your on-rent fleet at a glance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-base font-semibold text-gray-900">
                  On-Rent Equipment
                </CardTitle>
                <div className="relative max-w-xs w-full">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <Input
                    placeholder="Search equipment..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">EQ #</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Model</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Year</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Location</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Date On Rent</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Days</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Monthly Rate</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wide w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const cust = item.customerOnRent ?? "Unknown";
                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-blue-50/40 transition-colors"
                          data-testid={`equipment-row-${item.id}`}
                        >
                          <TableCell className="font-mono font-bold text-blue-700 text-sm">
                            {item.equipmentNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{item.model}</span>
                              {item.specs && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{item.specs}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{item.year || "—"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor(cust)}`}>
                              {cust}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{item.location || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.dateOnOffRent || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 text-right tabular-nums">
                            {item.daysOnOffRent != null ? item.daysOnOffRent : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-gray-900 text-right tabular-nums">
                            {item.monthlyRate != null
                              ? `$${item.monthlyRate.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => setDownDayEquipment(item)}
                              title="Report Down Day"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Down Day
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && search && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                          No equipment matching "{search}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer summary */}
              {filtered.length > 0 && (
                <div className="border-t bg-gray-50/60 px-6 py-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Showing <strong className="text-gray-700">{filtered.length}</strong> of {equipment.length} pieces
                  </span>
                  <span className="text-gray-500">
                    Total: <strong className="text-gray-900">${filtered.reduce((s, e) => s + (e.monthlyRate ?? 0), 0).toLocaleString()}</strong>/mo
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DownDayModal
        equipment={downDayEquipment}
        isOpen={!!downDayEquipment}
        onClose={() => setDownDayEquipment(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "violet" | "emerald" | "amber";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  const textColor = {
    blue: "text-blue-900",
    violet: "text-violet-900",
    emerald: "text-emerald-900",
    amber: "text-amber-900",
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold ${textColor[color]} -mt-0.5`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
