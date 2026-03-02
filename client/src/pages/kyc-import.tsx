import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye, AlertTriangle, XCircle, ChevronDown, X, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

interface KycImportResults {
  companiesCreated: number;
  contactsCreated: number;
  interactionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

export function KycImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [results, setResults] = useState<KycImportResults | null>(null);
  const [isDryRunResult, setIsDryRunResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const importMutation = useMutation({
    mutationFn: async ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);

      const url = dryRun ? "/api/import-kyc-csv?dryRun=true" : "/api/import-kyc-csv";

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error("Please sign in to import sales data");
        }
        throw new Error(error.details || error.error || "Import failed");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setIsDryRunResult(data.dryRun);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Import Successful",
        description: data.message,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("sign in")) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: `${errorMessage}. Redirecting to login...`,
        });
        setTimeout(() => setLocation("/login"), 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: errorMessage,
        });
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fileName = droppedFile.name.toLowerCase();
      const isValidFile = fileName.endsWith(".csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

      if (isValidFile) {
        setFile(droppedFile);
        setResults(null);
        toast({
          title: "File ready",
          description: `${droppedFile.name} is ready to import`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate({ file, dryRun });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="flex items-center gap-4">
            <Link href="/contacts">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Import Sales Log</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Import contacts, companies, and interactions from KYC Master spreadsheet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200 select-none
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-[1.01] ring-4 ring-blue-100"
                    : file
                      ? "border-green-300 bg-green-50/50 hover:border-green-400"
                      : "border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(0)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setResults(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full transition-all duration-200 ${isDragging ? "bg-blue-100 scale-110" : "bg-gray-100"}`}>
                    <Upload className={`h-10 w-10 transition-colors duration-200 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {isDragging ? "Drop your file here" : "Click to upload or drag and drop"}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">CSV with columns: Date, Type, Customer, Contact, Role, Notes</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked as boolean)}
                  className="h-5 w-5"
                />
                <Label htmlFor="dry-run" className="text-sm font-medium cursor-pointer">
                  Preview changes first
                </Label>
              </div>
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                size="lg"
                className={`min-w-[180px] font-semibold ${dryRun ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {importMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {dryRun ? "Previewing..." : "Importing..."}
                  </>
                ) : dryRun ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Import
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Sales Data
                  </>
                )}
              </Button>
            </div>

            {importMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Processing CSV file...
              </div>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center gap-3">
                {isDryRunResult ? (
                  <>
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Eye className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Preview Results</h2>
                      <p className="text-sm text-gray-500">No data was modified</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Import Complete</h2>
                      <p className="text-sm text-gray-500">Sales log import finished</p>
                    </div>
                  </>
                )}
              </div>

              {isDryRunResult && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <AlertTitle className="text-yellow-900 font-semibold">Dry Run Mode</AlertTitle>
                  <AlertDescription className="text-yellow-800">
                    This is a preview. No companies, contacts, or interactions have been created. Uncheck "Preview changes first" and click Import to apply these changes.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-5 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-700 mb-1">{results.companiesCreated}</div>
                  <div className="text-sm font-medium text-blue-800">Companies Created</div>
                </div>
                <div className="text-center p-5 bg-green-50 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700 mb-1">{results.contactsCreated}</div>
                  <div className="text-sm font-medium text-green-800">Contacts Created</div>
                </div>
                <div className="text-center p-5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div className="text-3xl font-bold text-indigo-700 mb-1">{results.interactionsCreated}</div>
                  <div className="text-sm font-medium text-indigo-800">Interactions Logged</div>
                </div>
                <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-3xl font-bold text-gray-700 mb-1">{results.duplicatesSkipped}</div>
                  <div className="text-sm font-medium text-gray-800">Duplicates Skipped</div>
                </div>
                <div className="text-center p-5 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-700 mb-1">{results.errors.length}</div>
                  <div className="text-sm font-medium text-yellow-800">Errors</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-700 font-semibold">
                    <AlertCircle className="h-5 w-5" />
                    <span>Import Errors ({results.errors.length})</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                    {results.errors.slice(0, 20).map((error, index) => (
                      <div key={index} className="text-sm text-red-800 mb-2 flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                    {results.errors.length > 20 && (
                      <div className="text-sm text-red-600 mt-2">... and {results.errors.length - 20} more</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-2">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 font-semibold">
                  <Link href="/contacts">View Contacts</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/companies">View Companies</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4 text-blue-500" />
              How KYC Import Works
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showHowItWorks ? "rotate-180" : ""}`} />
          </button>
          {showHowItWorks && (
            <div className="border-t px-4 pb-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="font-medium text-sm text-gray-900 mb-2">Data Normalization</div>
                  <p className="text-sm text-gray-600">Company names are normalized and deduplicated. Contacts are parsed from the Contact field.</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="font-medium text-sm text-gray-900 mb-2">Duplicate Detection</div>
                  <p className="text-sm text-gray-600">Companies and contacts are matched to existing records. Interactions are always created for each row.</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="font-medium text-sm text-gray-900 mb-2">What Gets Created</div>
                  <p className="text-sm text-gray-600">Companies, contacts, and interaction records. Each row becomes an interaction tied to the contact and company.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
