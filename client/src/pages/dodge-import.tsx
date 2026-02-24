import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye, AlertTriangle, XCircle, FileCheck, Zap, Shield, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

interface ImportResults {
  imported: number;
  updated: number;
  skipped: number;
  unchanged?: number;
  errors: string[];
  dryRun?: boolean;
  details?: {
    inserted?: any[];
    updated_unlocked?: any[];
    skipped_locked?: any[];
    unchanged?: any[];
    conflicts?: any[];
  };
}

export function DodgeImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCsvFormat, setShowCsvFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const importMutation = useMutation({
    mutationFn: async ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const url = dryRun 
        ? '/api/import-dodge-csv?dryRun=true'
        : '/api/import-dodge-csv';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Please sign in to import jobs');
        }
        throw new Error(error.details || error.error || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Import Successful",
        description: data.message,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes('sign in')) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: `${errorMessage}. Redirecting to login...`,
        });
        setTimeout(() => setLocation('/login'), 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: errorMessage,
        });
      }
    }
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
      const isValidFile = fileName.endsWith('.csv') || 
                         fileName.endsWith('.xlsx') || 
                         fileName.endsWith('.xls');
      
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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate({ file, dryRun });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Top bar */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Dodge Data Import</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Import jobs from Dodge Data CSV exports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* File Upload */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200 select-none
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 scale-[1.01] ring-4 ring-blue-100' 
                  : file 
                    ? 'border-green-300 bg-green-50/50 hover:border-green-400' 
                    : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                data-testid="file-input"
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
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full transition-all duration-200 ${
                    isDragging ? 'bg-blue-100 scale-110' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-10 w-10 transition-colors duration-200 ${
                      isDragging ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      CSV or Excel files (.csv, .xlsx, .xls)
                    </div>
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
                className={`
                  min-w-[180px] font-semibold
                  ${dryRun 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  }
                `}
                data-testid="import-button"
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
                    Import Jobs
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

        {/* Import Results */}
        {results && (
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center gap-3">
                {results.dryRun ? (
                  <>
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileCheck className="h-5 w-5 text-yellow-600" />
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
                      <p className="text-sm text-gray-500">CSV import operation finished</p>
                    </div>
                  </>
                )}
              </div>

              {results.dryRun && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <AlertTitle className="text-yellow-900 font-semibold">Dry Run Mode</AlertTitle>
                  <AlertDescription className="text-yellow-800">
                    This is a preview. No jobs have been imported or modified. 
                    Uncheck "Preview changes first" and click Import to apply these changes.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-5 bg-green-50 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700 mb-1">{results.imported}</div>
                  <div className="text-sm font-medium text-green-800">
                    {results.dryRun ? "Would Be Added" : "New Jobs Added"}
                  </div>
                </div>
                <div className="text-center p-5 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-700 mb-1">{results.updated}</div>
                  <div className="text-sm font-medium text-blue-800">
                    {results.dryRun ? "Would Be Updated" : "Jobs Updated"}
                  </div>
                </div>
                <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-3xl font-bold text-gray-700 mb-1">{results.unchanged || 0}</div>
                  <div className="text-sm font-medium text-gray-800">Unchanged</div>
                </div>
                <div className="text-center p-5 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-700 mb-1">{results.skipped}</div>
                  <div className="text-sm font-medium text-yellow-800">
                    {results.dryRun ? "Would Be Skipped" : "Skipped"}
                  </div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-700 font-semibold">
                    <AlertCircle className="h-5 w-5" />
                    <span>Import Errors ({results.errors.length})</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-800 mb-2 flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 font-semibold">
                  <a href="/">View Jobs on Map</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How Duplicate Handling Works - Collapsible */}
        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Zap className="h-4 w-4 text-blue-500" />
              How Duplicate Handling Works
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showHowItWorks ? 'rotate-180' : ''}`} />
          </button>
          {showHowItWorks && (
            <div className="border-t px-4 pb-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Smart Matching</span>
                  </div>
                  <p className="text-sm text-gray-600">Matches by project ID, name + address, or value to prevent duplicates</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                      <Shield className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Preserve Tracking</span>
                  </div>
                  <p className="text-sm text-gray-600">Keeps your viewed status, notes, and custom data intact</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <Eye className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Color Coding</span>
                  </div>
                  <p className="text-sm text-gray-600">Visual distinction between new jobs and viewed jobs on the map</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expected CSV Format - Collapsible */}
        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowCsvFormat(!showCsvFormat)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileSpreadsheet className="h-4 w-4 text-gray-500" />
              Expected CSV Format
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showCsvFormat ? 'rotate-180' : ''}`} />
          </button>
          {showCsvFormat && (
            <div className="border-t px-4 pb-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Required</h4>
                  <ul className="space-y-2">
                    {['Project Name', 'Address', 'City', 'State'].map((col) => (
                      <li key={col} className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <code className="text-sm text-gray-700">{col}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Optional</h4>
                  <ul className="space-y-2">
                    {[
                      { name: 'Project ID', note: 'for duplicate detection' },
                      { name: 'Project Value' },
                      { name: 'Project Type' },
                      { name: 'Contractor' },
                      { name: 'Start Date' },
                      { name: 'Phone' },
                      { name: 'Email' },
                    ].map(({ name, note }) => (
                      <li key={name} className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        <code className="text-sm text-gray-700">{name}</code>
                        {note && <span className="text-xs text-gray-400">({note})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
