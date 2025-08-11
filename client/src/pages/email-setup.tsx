import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Mail, Webhook, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EmailSetupPage() {
  const { toast } = useToast();

  const { data: setupInfo, isLoading } = useQuery<{
    instructions: string;
    webhookUrl: string;
    dedicatedEmail: string;
  }>({
    queryKey: ['/api/email-setup'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please copy manually",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Automation Setup</h1>
        <p className="text-gray-600 mt-2">
          Configure automated Excel processing via email for daily equipment updates
        </p>
      </div>

      {/* Quick Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            How It Works
          </CardTitle>
          <CardDescription>
            Send equipment Excel files to a dedicated email address for automatic processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">1. Send Email</div>
                <div className="text-sm text-gray-600">Attach Excel file</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <Webhook className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">2. Auto Process</div>
                <div className="text-sm text-gray-600">Webhook triggered</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">3. Data Updated</div>
                <div className="text-sm text-gray-600">Equipment synced</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Email */}
      <Card>
        <CardHeader>
          <CardTitle>Dedicated Email Address</CardTitle>
          <CardDescription>
            Send your Excel equipment reports to this address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <div className="font-mono text-lg font-medium text-blue-800">
                {setupInfo?.dedicatedEmail || 'equipment-reports@your-domain.com'}
              </div>
              <div className="text-sm text-blue-600">
                Equipment Reports Processing Email
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(setupInfo?.dedicatedEmail || '', 'Email address')}
              data-testid="copy-email-button"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Subject:</strong> Any subject (e.g., "Daily Equipment Status")</p>
            <p><strong>Attachments:</strong> Excel files (.xlsx, .xls) containing equipment data</p>
            <p><strong>Processing:</strong> Automatic within seconds of receiving email</p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            For email service providers and automation setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-mono text-sm break-all">
                {setupInfo?.webhookUrl || 'https://your-app.replit.app/api/email-webhook'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                POST endpoint for email webhook
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(setupInfo?.webhookUrl || '', 'Webhook URL')}
              data-testid="copy-webhook-button"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Service Options */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Email Services</CardTitle>
          <CardDescription>
            Choose an email service provider for webhook integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Mailgun</h3>
                <Badge variant="secondary">Recommended</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Enterprise email service with excellent webhook support
              </p>
              <ul className="text-sm space-y-1">
                <li>• Easy domain setup</li>
                <li>• Reliable webhooks</li>
                <li>• Free tier available</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">SendGrid</h3>
                <Badge variant="outline">Popular</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Reliable email platform with Inbound Parse webhooks
              </p>
              <ul className="text-sm space-y-1">
                <li>• Inbound Parse API</li>
                <li>• Good documentation</li>
                <li>• Attachment handling</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Zapier</h3>
                <Badge variant="outline">Easy Setup</Badge>
              </div>
              <p className="text-sm text-gray-600">
                No-code automation with Email Parser
              </p>
              <ul className="text-sm space-y-1">
                <li>• Visual setup</li>
                <li>• No coding required</li>
                <li>• Multiple triggers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Security</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• File type validation (Excel only)</li>
                <li>• Size limits enforced</li>
                <li>• Processing logs maintained</li>
                <li>• Webhook endpoint authentication</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Features</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Automatic Excel processing</li>
                <li>• Equipment number extraction</li>
                <li>• Hudson account manager filtering</li>
                <li>• Real-time data updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">
              Email automation ready - Configure email service provider to start receiving automated updates
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}