import { useState } from "react";
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
import { Upload, MapPin, CheckCircle, AlertCircle, Info, Eye, AlertTriangle, XCircle, FileCheck, Sparkles, Zap, Shield, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

interface ImportResults {
  imported: number;
  skipped: number;
  errors: string[];
  dryRun?: boolean;
  details?: {
    inserted?: any[];
    skipped_duplicates?: any[];
  };
}

export function AppleMapsImportPage() {
  const [url, setUrl] = useState("");
  const [dryRun, setDryRun] = useState(true); // Default to dry-run for safety
  const [results, setResults] = useState<ImportResults | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const importMutation = useMutation({
    mutationFn: async ({ url, dryRun }: { url: string; dryRun: boolean }) => {
      const apiUrl = dryRun 
        ? '/api/import-apple-maps?dryRun=true'
        : '/api/import-apple-maps';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Please sign in to import offices');
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

  const handleImport = () => {
    if (url.trim()) {
      importMutation.mutate({ url: url.trim(), dryRun });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Import Office Addresses
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Import customer office addresses from an Apple Maps guide. Offices will be displayed separately from jobsites.
        </p>
      </div>

      {/* URL Input */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-cyan-500 rounded-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            Apple Maps Guide URL
          </CardTitle>
          <CardDescription className="text-base">
            Paste the Apple Maps guide URL containing your customer office addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <Label htmlFor="apple-maps-url">Apple Maps Guide URL</Label>
            <Input
              id="apple-maps-url"
              type="url"
              placeholder="https://maps.apple.com/guides?user=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full"
              data-testid="apple-maps-url-input"
            />
            <p className="text-sm text-gray-500">
              Open your Apple Maps guide, click "Share" and copy the link, then paste it here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="dry-run-office" 
                checked={dryRun}
                onCheckedChange={(checked) => setDryRun(checked as boolean)}
                className="h-5 w-5"
              />
              <Label htmlFor="dry-run-office" className="text-sm font-medium cursor-pointer">
                Preview Only (Dry Run)
              </Label>
            </div>
            <Button
              onClick={handleImport}
              disabled={!url.trim() || importMutation.isPending}
              size="lg"
              className={`
                min-w-[180px] font-semibold
                ${dryRun 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700'
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
                      Import Offices
                    </>
                  )}
                </>
              )}
            </Button>
          </div>

          {importMutation.isPending && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                Processing Apple Maps guide...
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
            How It Works
          </CardTitle>
          <CardDescription className="text-base">
            Our system automatically extracts office addresses from your Apple Maps guide
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
                <div className="font-semibold text-lg mb-2 text-gray-900">1. Extract Addresses</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  Automatically parses company names and addresses from your Apple Maps guide
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border-2 border-yellow-100 bg-gradient-to-br from-yellow-50 to-white p-6 transition-all hover:border-yellow-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
              <div className="relative">
                <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-lg mb-2 text-gray-900">2. Prevent Duplicates</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  Skips offices that already exist in your database
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-6 transition-all hover:border-green-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
              <div className="relative">
                <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-lg mb-2 text-gray-900">3. Categorize as Offices</div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  All imported addresses are marked as "offices" and displayed separately from jobsites
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
                ? "Preview of offices that would be imported (no data was modified)"
                : "Summary of the completed Apple Maps import operation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {results.dryRun && (
              <Alert className="border-2 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <AlertTitle className="text-yellow-900 font-semibold">Dry Run Mode</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  This is a preview. No offices have been imported. 
                  Uncheck "Preview Only" and click Import to add these offices to your database.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-green-700 mb-2">{results.imported}</div>
                <div className="text-sm font-medium text-green-800">
                  {results.dryRun ? "Would Be Added" : "Offices Added"}
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-gray-700 mb-2">{results.skipped}</div>
                <div className="text-sm font-medium text-gray-800">Skipped</div>
              </div>
              {results.errors.length > 0 && (
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-red-700 mb-2">{results.errors.length}</div>
                  <div className="text-sm font-medium text-red-800">Errors</div>
                </div>
              )}
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
                <a href="/">View Offices on Map</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Info className="h-5 w-5 text-white" />
            </div>
            How to Get Your Apple Maps Guide URL
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ol className="space-y-4 list-decimal list-inside">
            <li className="text-sm text-gray-700">
              Open Apple Maps on your Mac or iPhone
            </li>
            <li className="text-sm text-gray-700">
              Navigate to your guide (the one with your customer office addresses)
            </li>
            <li className="text-sm text-gray-700">
              Click the "Share" button (or right-click on the guide)
            </li>
            <li className="text-sm text-gray-700">
              Select "Copy Link" to copy the guide URL
            </li>
            <li className="text-sm text-gray-700">
              Paste the URL into the field above and click "Preview Import" to see what will be imported
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
