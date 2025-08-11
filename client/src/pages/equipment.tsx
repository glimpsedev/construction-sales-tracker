import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { RentalEquipment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Equipment() {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rental equipment data
  const { data: equipment = [], isLoading, error } = useQuery<RentalEquipment[]>({
    queryKey: ['/api/rental-equipment'],
  });

  // Upload and process equipment email mutation
  const processEmailMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/process-equipment-email', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to process equipment email');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment status email processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rental-equipment'] });
      setFile(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process equipment email",
      });
      console.error('Upload error:', error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      processEmailMutation.mutate(file);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_rent':
        return <Badge variant="default" className="bg-green-500">On Rent</Badge>;
      case 'off_rent':
        return <Badge variant="secondary">Off Rent</Badge>;
      case 'maintenance':
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Equipment</h2>
          <p className="text-gray-600 mt-2">Failed to load rental equipment data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="equipment-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Equipment Rental Tracking</h1>
          <p className="text-gray-600 mt-1">
            Automated processing of daily equipment status emails
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700 font-medium">
              {equipment.length} Equipment Items
            </span>
          </div>
        </div>
      </div>

      {/* Email Processing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Process Equipment Status Email</CardTitle>
          <CardDescription>
            Upload the daily equipment status Excel file to automatically update rental tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="max-w-md"
              data-testid="file-input"
            />
            <Button
              onClick={handleUpload}
              disabled={!file || processEmailMutation.isPending}
              data-testid="upload-button"
            >
              {processEmailMutation.isPending ? "Processing..." : "Upload & Process"}
            </Button>
          </div>
          {file && (
            <p className="text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Rental Status</CardTitle>
          <CardDescription>
            Equipment currently on rent (filtered for Hudson account manager)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading equipment data...</span>
            </div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No equipment data available</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload an equipment status email to see rental data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment #</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Customer On Rent</TableHead>
                    <TableHead>Account Manager</TableHead>
                    <TableHead>Date On/Off Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow key={item.id} data-testid={`equipment-row-${item.id}`}>
                      <TableCell className="font-bold text-blue-600">{item.equipmentNumber}</TableCell>
                      <TableCell className="font-medium">{item.model}</TableCell>
                      <TableCell>{item.customer}</TableCell>
                      <TableCell>{item.customerOnRent || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.acctMgr}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.dateOnOffRent || '')}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(item.lastUpdated?.toString() || '')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}