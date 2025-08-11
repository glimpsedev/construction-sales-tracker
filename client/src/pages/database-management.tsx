import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, AlertTriangle, BarChart3 } from "lucide-react";
import { GeocodeButton } from "@/components/GeocodeButton";

interface DatabaseStats {
  totalJobs: string;
  jobsWithDodgeId: string;
  viewedJobs: string;
  unviewedJobs: number;
}

export default function DatabaseManagement() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const { toast } = useToast();

  const fetchStatsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/debug/job-count');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    onSuccess: (data) => {
      setStats(data);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch database statistics"
      });
    }
  });

  const clearDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/debug/clear-jobs', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear database');
      return response.json();
    },
    onSuccess: (data) => {
      setStats(null);
      setConfirmClear(false);
      toast({
        title: "Database Cleared",
        description: `Successfully deleted ${data.deletedCount} jobs`
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear database"
      });
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Management</h1>
        <p className="text-gray-600">
          View database statistics and manage your job data
        </p>
      </div>

      <div className="grid gap-6">
        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Database Statistics
            </CardTitle>
            <CardDescription>
              Current state of your job database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => fetchStatsMutation.mutate()}
              disabled={fetchStatsMutation.isPending}
              className="mb-4"
              data-testid="fetch-stats-button"
            >
              <Database className="h-4 w-4 mr-2" />
              {fetchStatsMutation.isPending ? "Loading..." : "Refresh Statistics"}
            </Button>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalJobs}</div>
                  <div className="text-sm text-blue-700">Total Jobs</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.jobsWithDodgeId}</div>
                  <div className="text-sm text-green-700">Dodge Jobs</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{stats.viewedJobs}</div>
                  <div className="text-sm text-gray-700">Viewed</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.unviewedJobs}</div>
                  <div className="text-sm text-yellow-700">Unviewed</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clear Database Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Clear Database
            </CardTitle>
            <CardDescription>
              Remove all job data from the database (useful for fresh CSV imports)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. All jobs, including your viewing status and notes, will be permanently deleted.
              </AlertDescription>
            </Alert>

            {!confirmClear ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmClear(true)}
                data-testid="confirm-clear-button"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Jobs
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => clearDatabaseMutation.mutate()}
                  disabled={clearDatabaseMutation.isPending}
                  data-testid="execute-clear-button"
                >
                  {clearDatabaseMutation.isPending ? "Clearing..." : "Yes, Delete Everything"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmClear(false)}
                  data-testid="cancel-clear-button"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geocoding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Geocode Job Addresses
            </CardTitle>
            <CardDescription>
              Convert job addresses to map coordinates for display
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Jobs without coordinates won't appear on the map. Click below to geocode addresses.
              </AlertDescription>
            </Alert>

            <GeocodeButton />
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Understanding Duplicate Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              When you upload a CSV file, the system checks for duplicates using:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Dodge Project ID</strong> - Exact match (primary method)</li>
              <li><strong>Project Name + Address</strong> - Exact match</li>
              <li><strong>Similar projects</strong> - Same address or close project values</li>
            </ul>
            <p className="mt-3">
              If you're seeing all jobs marked as duplicates, it means your database already contains those jobs from a previous import.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}