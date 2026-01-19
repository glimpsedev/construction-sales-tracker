import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, Eye, AlertTriangle, XCircle, FileCheck, Sparkles, Zap, Shield } from "lucide-react";
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
  const [dryRun, setDryRun] = useState(true); // Default to dry-run for safety
  const [results, setResults] = useState<ImportResults | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
        
        // Handle authentication errors
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
      
      // Check if it's an authentication error
      if (errorMessage.includes('sign in')) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: `${errorMessage}. Redirecting to login...`,
        });
        // Redirect to login after 2 seconds
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
      setResults(null); // Clear previous results
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
    // Only set dragging to false if we're actually leaving the drop zone
    // (not just moving between child elements)
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

  const getFileTypeIcon = (filename: string) => {
    if (filename.endsWith('.csv') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <FileSpreadsheet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Dodge Data Import
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Import construction jobs from Dodge Data CSV exports with intelligent duplicate detection and automatic geocoding
        </p>
      </div>

      {/* File Upload */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-green-500 rounded-lg">
              <Upload className="h-5 w-5 text-white" />
            </div>
            Upload Dodge CSV File
          </CardTitle>
          <CardDescription className="text-base">
            Select or drag & drop a CSV or Excel file exported from Dodge Data Analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={(e) => {
              // Don't trigger file input if clicking on a file that's already selected
              if (!file) {
                fileInputRef.current?.click();
              }
            }}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200 select-none
              ${isDragging 
                ? 'border-green-500 bg-green-100 scale-[1.02] shadow-lg ring-4 ring-green-200' 
                : file 
                  ? 'border-green-400 bg-green-50/70 hover:border-green-500' 
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
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <FileSpreadsheet className="h-12 w-12 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-lg text-gray-900">{file.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Click to change file
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full transition-all duration-200 ${
                  isDragging 
                    ? 'bg-green-200 scale-110' 
                    : 'bg-gray-100'
                }`}>
                  <Upload className={`h-12 w-12 transition-colors duration-200 ${
                    isDragging ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <div className={`font-semibold text-lg mb-1 transition-colors duration-200 ${
                    isDragging ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                  </div>
                  <div className={`text-sm transition-colors duration-200 ${
                    isDragging ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    CSV or Excel files only (.csv, .xlsx, .xls)
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
                Preview Only (Dry Run)
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
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }
              `}
              data-testid="import-button"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {dryRun ? "Previewing..." : "Importing..."}
                </>
              ) : (
                <>
                  {dryRun ? (
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
                </>
              )}
            </Button>
          </div>

          {importMutation.isPending && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Processing CSV file...
              </div>
              <Progress value={undefined} className="w-full h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            How Duplicate Handling Works
          </CardTitle>
          <CardDescription className="text-base">
            Our intelligent system automatically detects and handles duplicates
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative overflow-hidden rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 transition-all hover:border-blue-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
              <div className="relative">
                <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-lg mb-2 text-gray-900">1. Smart Matching</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  Matches by project ID, name + address, or value to prevent duplicates
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border-2 border-yellow-100 bg-gradient-to-br from-yellow-50 to-white p-6 transition-all hover:border-yellow-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
              <div className="relative">
                <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-lg mb-2 text-gray-900">2. Preserve Tracking</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  Keeps your viewed status, notes, and custom data intact
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-6 transition-all hover:border-green-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
              <div className="relative">
                <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-lg mb-2 text-gray-900">3. Color Coding</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  Visual distinction between new jobs and viewed jobs on the map
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {results && (
        <Card className="border-2 shadow-xl">
          <CardHeader className={`${results.dryRun ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'bg-gradient-to-r from-green-50 to-emerald-50'} border-b`}>
            <CardTitle className="flex items-center gap-3 text-xl">
              {results.dryRun ? (
                <>
                  <div className="p-2 bg-yellow-500 rounded-lg">
                    <FileCheck className="h-5 w-5 text-white" />
                  </div>
                  Preview Results
                </>
              ) : (
                <>
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  Import Results
                </>
              )}
            </CardTitle>
            <CardDescription className="text-base">
              {results.dryRun 
                ? "Preview of changes that would be made (no data was modified)"
                : "Summary of the completed CSV import operation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {results.dryRun && (
              <Alert className="border-2 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <AlertTitle className="text-yellow-900 font-semibold">Dry Run Mode</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  This is a preview. No jobs have been imported or modified. 
                  Uncheck "Preview Only" and click Import to apply these changes.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-green-700 mb-2">{results.imported}</div>
                <div className="text-sm font-medium text-green-800">
                  {results.dryRun ? "Would Be Added" : "New Jobs Added"}
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-blue-700 mb-2">{results.updated}</div>
                <div className="text-sm font-medium text-blue-800">
                  {results.dryRun ? "Would Be Updated" : "Jobs Updated"}
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-gray-700 mb-2">{results.unchanged || 0}</div>
                <div className="text-sm font-medium text-gray-800">Unchanged</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-yellow-700 mb-2">{results.skipped}</div>
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
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-2 flex items-start gap-2">
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold">
                <a href="/">View Jobs on Map</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Format Guide */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            Expected CSV Format
          </CardTitle>
          <CardDescription className="text-base">
            Required and optional columns for Dodge Data imports
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-lg text-green-700">Required Columns</h4>
              </div>
              <ul className="space-y-2">
                {['Project Name', 'Address', 'City', 'State'].map((col) => (
                  <li key={col} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <code className="bg-green-50 text-green-900 px-3 py-1.5 rounded-md text-sm font-medium border border-green-200">
                      {col}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
                <h4 className="font-semibold text-lg text-blue-700">Optional Columns</h4>
              </div>
              <ul className="space-y-2">
                {[
                  'Project ID (for duplicate detection)',
                  'Project Value',
                  'Project Type',
                  'Contractor',
                  'Start Date',
                  'Phone',
                  'Email'
                ].map((col) => (
                  <li key={col} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-300 flex-shrink-0"></div>
                    <code className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-200">
                      {col.split(' ')[0]} {col.includes('(') ? col.split('(')[1] : ''}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Benefits */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-gray-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            Key Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[
                'Automatic duplicate detection',
                'Preserves your viewing status and notes',
                'Smart address geocoding'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                  <div className="mt-0.5 p-1.5 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[
                'Updates existing jobs with new data',
                'Supports CSV and Excel formats',
                'Detailed import reporting'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                  <div className="mt-0.5 p-1.5 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}