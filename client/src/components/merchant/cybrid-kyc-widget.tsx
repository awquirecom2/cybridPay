import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CybridKycWidgetProps {
  customerId?: string;
  onVerificationComplete?: (status: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function CybridKycWidget({
  customerId,
  onVerificationComplete,
  onError,
  className = ""
}: CybridKycWidgetProps) {
  const cybridRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get merchant profile to retrieve Cybrid customer ID
  const { data: merchantProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/merchant/profile'],
    enabled: !customerId, // Only fetch if customerId not provided
  });

  // Get or generate JWT token for Cybrid authentication
  const { data: cybridToken, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['/api/cybrid/token'],
    refetchInterval: 45 * 60 * 1000, // Refresh token every 45 minutes
    staleTime: 50 * 60 * 1000, // Consider stale after 50 minutes
  });

  const effectiveCustomerId = customerId || (merchantProfile as any)?.cybridCustomerGuid;
  const isLoading = profileLoading || tokenLoading;

  useEffect(() => {
    // Load Cybrid SDK script if not already loaded
    const existingScript = document.querySelector('script[src*="cybrid-sdk-ui"]');
    if (!existingScript && effectiveCustomerId && cybridToken) {
      const script = document.createElement('script');
      script.src = 'https://js.cybrid.app/v1/cybrid-sdk-ui.js';
      script.onload = () => initializeCybridWidget();
      script.onerror = () => {
        setError('Failed to load Cybrid SDK');
        onError?.('Failed to load Cybrid SDK');
      };
      document.head.appendChild(script);
    } else if (effectiveCustomerId && cybridToken && (window as any).customElements?.get('cybrid-app')) {
      // Script already loaded, initialize widget
      initializeCybridWidget();
    }
  }, [effectiveCustomerId, cybridToken]);

  const initializeCybridWidget = () => {
    if (!cybridRef.current || !effectiveCustomerId || !cybridToken) return;

    try {
      console.log('🔧 Initializing Cybrid widget with:', {
        customerId: effectiveCustomerId,
        tokenPresent: !!(cybridToken as any)?.accessToken,
        tokenLength: (cybridToken as any)?.accessToken?.length || 0
      });

      // Clear existing content
      cybridRef.current.innerHTML = '';

      // Create cybrid-app element
      const cybridApp = document.createElement('cybrid-app');

      // Configure the widget for KYC verification
      const config = {
        refreshInterval: 10000,
        routing: false,
        locale: 'en-US',
        theme: 'LIGHT',
        customer: effectiveCustomerId,
        fiat: 'USD',
        features: ['identity_verifications'],
        environment: 'sandbox' // Match backend environment mapping
      };

      console.log('🔧 Widget config:', config);
      (cybridApp as any).config = config;

      // Set authentication token
      (cybridApp as any).token = (cybridToken as any)?.accessToken;
      console.log('🔧 Token set on widget');

      // Listen for verification events
      cybridApp.addEventListener('verification-complete', (event: any) => {
        console.log('KYC verification completed:', event.detail);
        setWidgetLoaded(true);
        onVerificationComplete?.(event.detail.status);
      });

      cybridApp.addEventListener('verification-error', (event: any) => {
        console.error('KYC verification error:', event.detail);
        setError(event.detail.message || 'Verification failed');
        onError?.(event.detail.message || 'Verification failed');
      });

      // Append to container
      cybridRef.current.appendChild(cybridApp);
      setWidgetLoaded(true);
      setError(null);

    } catch (err) {
      console.error('Failed to initialize Cybrid widget:', err);
      setError('Failed to initialize verification widget');
      onError?.('Failed to initialize verification widget');
    }
  };

  const retryInitialization = () => {
    setError(null);
    setWidgetLoaded(false);
    initializeCybridWidget();
  };

  if (isLoading) {
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
              <span>Loading verification system...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokenError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to authenticate with verification system. Please contact support if this continues.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!effectiveCustomerId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Customer account not found. Please ensure your merchant account has been properly set up by an administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Verification Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={retryInitialization} variant="outline" data-testid="button-retry-kyc">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Identity Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Complete your identity verification to satisfy regulatory requirements. This process is secure and your information is protected.
            </AlertDescription>
          </Alert>

          {!widgetLoaded && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Initializing verification widget...</span>
              </div>
            </div>
          )}

          <div 
            ref={cybridRef} 
            className="min-h-[400px] w-full"
            data-testid="cybrid-kyc-widget"
            style={{ minHeight: widgetLoaded ? 'auto' : '400px' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}