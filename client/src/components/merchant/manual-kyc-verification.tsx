import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, Copy } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ManualKycVerificationProps {
  onVerificationComplete?: (status: string) => void;
  className?: string;
}

export function ManualKycVerification({
  onVerificationComplete,
  className = ""
}: ManualKycVerificationProps) {
  const [verificationData, setVerificationData] = useState<{
    verificationGuid: string;
    personaUrl: string;
    redirectUrl?: string;
    inquiryId: string;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Get current KYC status
  const { data: kycStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/cybrid/kyc-status'],
    refetchInterval: isPolling ? 5000 : false, // Poll every 5 seconds when in progress
    refetchIntervalInBackground: true,
    staleTime: 1000 // Prevent excessive refetching
  });

  // Handle status changes in useEffect to avoid render-time state updates
  useEffect(() => {
    if (kycStatus && (kycStatus as any).status) {
      const status = (kycStatus as any).status;
      if (status === 'approved' || status === 'rejected') {
        if (isPolling) {
          setIsPolling(false);
          onVerificationComplete?.(status);
        }
      }
    }
  }, [kycStatus, isPolling, onVerificationComplete]);

  // Start manual KYC mutation
  const startKycMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cybrid/start-manual-kyc');
      return response.json();
    },
    onSuccess: (data: any) => {
      setVerificationData({
        verificationGuid: data.verificationGuid,
        personaUrl: data.personaUrl,
        redirectUrl: data.redirectUrl,
        inquiryId: data.inquiryId
      });
      setIsPolling(true);
      
      // Invalidate and refetch status to get latest state
      queryClient.invalidateQueries({ queryKey: ['/api/cybrid/kyc-status'] });
      refetchStatus();
    },
    onError: (error: any) => {
      console.error('Failed to start manual KYC:', error);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in_review':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'pending':
      default:
        return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Under Review</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return "Your identity has been successfully verified. You can now access all merchant features.";
      case 'rejected':
        return "Identity verification was not successful. Please contact support for assistance.";
      case 'in_review':
        return "Your identity verification is being reviewed. This typically takes 1-2 business days.";
      case 'pending':
      default:
        return "Identity verification is required to comply with financial regulations and enable payment processing.";
    }
  };

  const handleStartVerification = () => {
    startKycMutation.mutate();
  };

  const handleOpenVerification = () => {
    if (verificationData?.personaUrl) {
      window.open(verificationData.personaUrl, '_blank', 'noopener,noreferrer');
      setIsPolling(true); // Start polling after opening verification
    }
  };

  const handleCopyUrl = async () => {
    if (verificationData?.personaUrl) {
      try {
        await navigator.clipboard.writeText(verificationData.personaUrl);
        // Could add a toast notification here
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  if (statusLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Identity Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading verification status...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = (kycStatus as any)?.status || 'pending';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(currentStatus)}
          Identity Verification
          <div className="ml-auto">
            {getStatusBadge(currentStatus)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {getStatusMessage(currentStatus)}
          </AlertDescription>
        </Alert>

        {(currentStatus === 'pending' || currentStatus === 'not_started') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">What you'll need:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Government-issued photo ID (passport, driver's license, or national ID)</li>
                <li>• A device with a camera for selfie verification</li>
                <li>• 5-10 minutes to complete the process</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleStartVerification}
              disabled={startKycMutation.isPending}
              className="w-full"
              data-testid="button-start-kyc"
            >
              {startKycMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Verification...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Identity Verification
                </>
              )}
            </Button>

            {startKycMutation.isError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to start verification. Please try again or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {verificationData?.personaUrl && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md">
              <label className="text-sm font-medium mb-2 block">Your Verification Link:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={verificationData.personaUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-background border rounded font-mono"
                  data-testid="input-verification-url"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'in_review' && !verificationData?.redirectUrl && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Verification in progress. We'll update your status automatically once the review is complete.
              {isPolling && (
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Checking for updates...</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(currentStatus === 'approved' || currentStatus === 'completed') && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Congratulations! Your identity has been verified and your merchant account is fully activated.
            </AlertDescription>
          </Alert>
        )}

        {currentStatus === 'rejected' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Identity verification was unsuccessful. Please contact our support team for assistance with next steps.
            </AlertDescription>
          </Alert>
        )}

        {(kycStatus as any)?.verificationGuid && (
          <div className="text-xs text-muted-foreground">
            Verification ID: {(kycStatus as any).verificationGuid}
          </div>
        )}
      </CardContent>
    </Card>
  );
}