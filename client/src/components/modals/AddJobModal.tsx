import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const addJobFormSchema = insertJobSchema.extend({
  projectValue: z.string().optional()
});

type AddJobFormData = z.infer<typeof addJobFormSchema>;

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddJobModal({ isOpen, onClose, onSuccess }: AddJobModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddJobFormData>({
    resolver: zodResolver(addJobFormSchema),
    defaultValues: {
      name: '',
      address: '',
      contractor: '',
      projectValue: '',
      status: 'active',
      type: 'commercial',
      notes: ''
    }
  });

  const onSubmit = async (data: AddJobFormData) => {
    try {
      setIsSubmitting(true);
      
      // Convert string values to proper types
      const submitData: InsertJob = {
        ...data,
        projectValue: data.projectValue || undefined,
        isCustom: true
      };
      
      await apiRequest('POST', '/api/jobs', submitData);
      
      toast({
        title: "Success",
        description: "Job site added successfully"
      });
      
      form.reset();
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error adding job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add job site",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="add-job-modal">
        <DialogHeader>
          <DialogTitle>Add Custom Job Site</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter job name"
                      {...field}
                      data-testid="input-job-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full address"
                      {...field}
                      data-testid="input-job-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="equipment">Equipment Drop</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-job-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contractor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="General contractor name"
                      {...field}
                      data-testid="input-contractor"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Value (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 250000"
                      type="number"
                      {...field}
                      data-testid="input-project-value"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or equipment details..."
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-blue-700"
                data-testid="button-submit-job"
              >
                {isSubmitting ? 'Adding...' : 'Add Job Site'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
