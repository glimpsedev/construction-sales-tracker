import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  filename: string;
  success: boolean;
  extractedData?: any;
  error?: string;
}

export default function DocumentUploadModal({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    // Filter for allowed file types
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    const validFiles = files.filter(file => 
      allowedTypes.includes(file.mimetype) || 
      file.name.endsWith('.doc') || 
      file.name.endsWith('.docx') || 
      file.name.endsWith('.txt')
    );
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload Word documents (.doc, .docx) or text files only.",
        variant: "destructive"
      });
      return;
    }
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Some Files Skipped",
        description: `${files.length - validFiles.length} files were skipped. Only Word documents and text files are allowed.`,
        variant: "destructive"
      });
    }

    await processFiles(validFiles);
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadResults([]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setUploadResults(data.results || []);

      const successCount = data.results?.filter((r: UploadResult) => r.success).length || 0;
      const errorCount = (data.results?.length || 0) - successCount;

      if (successCount > 0) {
        toast({
          title: "Upload Successful",
          description: `${successCount} document(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
        onSuccess();
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Upload Failed",
          description: `${errorCount} document(s) failed to process`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadResults([]);
      onClose();
    }
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="document-upload-modal">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleChooseFiles}
            data-testid="upload-drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".doc,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              data-testid="file-input"
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-lg font-medium text-darktext">Processing documents...</p>
                <p className="text-sm text-gray-500">Extracting addresses and equipment information</p>
              </div>
            ) : (
              <div className="space-y-4">
                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400"></i>
                <p className="text-lg font-medium text-darktext">Drop Word documents here</p>
                <p className="text-sm text-gray-500">or click to browse files</p>
                <Button 
                  type="button"
                  className="bg-primary hover:bg-blue-700"
                  data-testid="button-choose-files"
                >
                  Choose Files
                </Button>
                <p className="text-xs text-gray-400">Supports .doc, .docx, and .txt files</p>
              </div>
            )}
          </div>

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-darktext">Processing Results</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-sm",
                      result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                    )}
                    data-testid={`upload-result-${index}`}
                  >
                    <div className="flex items-center space-x-2">
                      <i className={cn(
                        "text-xs",
                        result.success ? "fas fa-check-circle" : "fas fa-exclamation-circle"
                      )}></i>
                      <span className="truncate">{result.filename}</span>
                    </div>
                    {result.success && result.extractedData && (
                      <div className="text-xs opacity-75">
                        {result.extractedData.addresses?.length || 0} addresses found
                      </div>
                    )}
                    {!result.success && result.error && (
                      <div className="text-xs opacity-75 truncate ml-2">
                        {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Integration Info */}
          <div>
            <h3 className="text-sm font-medium text-darktext mb-3">Email Integration</h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-blue-800">
                <strong>Forward equipment emails to:</strong>
              </p>
              <p className="font-mono text-sm text-blue-900">
                docs@your-tracker-domain.com
              </p>
              <p className="text-xs text-blue-600">
                Addresses will be automatically extracted and added as job sites
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1"
            data-testid="button-close-upload"
          >
            {uploadResults.length > 0 ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
