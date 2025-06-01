
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ProcessingJob {
  id: string;
  status: string;
  total_postcodes: number;
  processed_postcodes: number;
  current_chunk: number;
  total_chunks: number;
  created_at: string;
  started_at: string;
  completed_at: string;
  report_generated_at: string;
  contacts: {
    full_name: string;
    company: string;
    email: string;
  };
}

export default function ProcessingStatus() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const email = searchParams.get('email');
  
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobStatus = async () => {
    try {
      if (!jobId && !email) {
        toast.error("Missing job ID or email parameter");
        return;
      }

      let query = supabase
        .from('processing_jobs')
        .select(`
          *,
          contacts(full_name, company, email)
        `);

      if (jobId) {
        query = query.eq('id', jobId);
      } else if (email) {
        query = query.eq('contacts.email', email);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) {
        console.error('Error fetching job status:', error);
        toast.error("Failed to fetch processing status");
        return;
      }

      if (data && data.length > 0) {
        setJob(data[0]);
      } else {
        toast.error("No processing job found");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to fetch processing status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobStatus();
  };

  useEffect(() => {
    fetchJobStatus();
    
    // Auto-refresh every 30 seconds if processing
    const interval = setInterval(() => {
      if (job && (job.status === 'pending' || job.status === 'processing')) {
        fetchJobStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [jobId, email]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'report_sent':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'report_sent':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Queued for Processing';
      case 'processing': return 'Processing';
      case 'completed': return 'Processing Complete';
      case 'report_sent': return 'Report Delivered';
      case 'failed': return 'Processing Failed';
      default: return status;
    }
  };

  const calculateProgress = () => {
    if (!job) return 0;
    return Math.round((job.processed_postcodes / job.total_postcodes) * 100);
  };

  const getEstimatedCompletion = () => {
    if (!job || job.status === 'completed' || job.status === 'report_sent') return null;
    
    const remainingPostcodes = job.total_postcodes - job.processed_postcodes;
    const estimatedMinutes = Math.ceil(remainingPostcodes * 2); // 2 minutes per postcode estimate
    
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minutes`;
    }
    
    const hours = Math.ceil(estimatedMinutes / 60);
    return `${hours} hours`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading processing status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              No Processing Job Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>We couldn't find a processing job with the provided information. Please check your email for the correct status link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                Property Report Processing Status
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Processing status for {job.contacts.full_name} from {job.contacts.company}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(job.status)}>
                {formatStatus(job.status)}
              </Badge>
              <span className="text-sm text-gray-600">
                Job ID: {job.id.slice(0, 8)}...
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{job.processed_postcodes} / {job.total_postcodes} postcodes</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
              <div className="text-sm text-gray-600">
                {calculateProgress()}% complete
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Processing Details</h4>
                <div className="text-sm space-y-1">
                  <div>Total Addresses: {job.total_postcodes}</div>
                  <div>Processed: {job.processed_postcodes}</div>
                  <div>Chunks: {job.current_chunk} / {job.total_chunks}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Timeline</h4>
                <div className="text-sm space-y-1">
                  <div>Started: {job.created_at ? new Date(job.created_at).toLocaleString() : 'Not started'}</div>
                  {job.started_at && (
                    <div>Processing began: {new Date(job.started_at).toLocaleString()}</div>
                  )}
                  {job.completed_at && (
                    <div>Completed: {new Date(job.completed_at).toLocaleString()}</div>
                  )}
                  {job.report_generated_at && (
                    <div>Report sent: {new Date(job.report_generated_at).toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>

            {getEstimatedCompletion() && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Estimated completion:</strong> {getEstimatedCompletion()}
                </p>
              </div>
            )}

            {job.status === 'report_sent' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <strong>Report Complete!</strong>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your property matching report has been sent to {job.contacts.email}. 
                  Please check your email for the downloadable report.
                </p>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <strong>Processing Failed</strong>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  There was an issue processing your request. Our team has been notified and will contact you shortly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
