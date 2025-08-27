import { useState, useEffect } from "react";
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
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, Eye, AlertTriangle, XCircle, FileCheck } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dodge Data Import</h1>
        <p className="text-gray-600 mt-2">
          Import construction jobs from Dodge Data CSV exports with automatic duplicate handling
        </p>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Duplicate Handling Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">1. Smart Matching</div>
                <div className="text-sm text-gray-600">Matches by project ID, name + address, or value</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-yellow-100 p-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <div className="font-medium">2. Preserve Tracking</div>
                <div className="text-sm text-gray-600">Keeps your viewed status and notes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">3. Color Coding</div>
                <div className="text-sm text-gray-600">New jobs vs. viewed jobs on map</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Dodge CSV File</CardTitle>
          <CardDescription>
            Select a CSV or Excel file exported from Dodge Data Analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="max-w-md"
              data-testid="file-input"
            />
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dry-run" 
                checked={dryRun}
                onCheckedChange={(checked) => setDryRun(checked as boolean)}
              />
              <Label htmlFor="dry-run" className="text-sm font-medium">
                Preview Only (Dry Run)
              </Label>
            </div>
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              variant={dryRun ? "secondary" : "default"}
              data-testid="import-button"
            >
              {importMutation.isPending 
                ? (dryRun ? "Previewing..." : "Importing...") 
                : (dryRun ? "Preview Import" : "Import Jobs")}
            </Button>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              {getFileTypeIcon(file.name)}
              <div>
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-gray-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}

          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Processing CSV file...</div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.dryRun ? (
                <>
                  <FileCheck className="h-5 w-5" />
                  Preview Results
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Import Results
                </>
              )}
            </CardTitle>
            <CardDescription>
              {results.dryRun 
                ? "Preview of changes that would be made (no data was modified)"
                : "Summary of the completed CSV import operation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.dryRun && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Dry Run Mode</AlertTitle>
                <AlertDescription>
                  This is a preview. No jobs have been imported or modified. 
                  Uncheck "Preview Only" and click Import to apply these changes.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.imported}</div>
                <div className="text-sm text-gray-600">
                  {results.dryRun ? "Would Be Added" : "New Jobs Added"}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{results.updated}</div>
                <div className="text-sm text-gray-600">
                  {results.dryRun ? "Would Be Updated" : "Jobs Updated"}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{results.unchanged || 0}</div>
                <div className="text-sm text-gray-600">Unchanged</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
                <div className="text-sm text-gray-600">
                  {results.dryRun ? "Would Be Skipped" : "Skipped"}
                </div>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Import Errors ({results.errors.length})</span>
                </div>
                <div className="bg-red-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button asChild>
                <a href="/">View Jobs on Map</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Expected CSV Format</CardTitle>
          <CardDescription>
            Required and optional columns for Dodge Data imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-green-600">Required Columns</h4>
              <ul className="text-sm space-y-1">
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Project Name</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Address</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">City</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">State</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-blue-600">Optional Columns</h4>
              <ul className="text-sm space-y-1">
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Project ID</code> (for duplicate detection)</li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Project Value</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Project Type</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Contractor</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Start Date</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Phone</code></li>
                <li>• <code className="bg-gray-100 px-2 py-1 rounded">Email</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Key Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Automatic duplicate detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Preserves your viewing status and notes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Smart address geocoding</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Updates existing jobs with new data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Supports CSV and Excel formats</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Detailed import reporting</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}