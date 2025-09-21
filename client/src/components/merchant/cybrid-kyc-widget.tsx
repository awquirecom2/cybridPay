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
  const [sdkReady, setSdkReady] = useState(false);

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

  // Load Cybrid SDK from reliable CDN
  useEffect(() => {
    console.log('🔧 Loading Cybrid SDK from CDN...');
    
    // Check if already loaded
    if (window.customElements?.get('cybrid-app')) {
      console.log('✅ Cybrid SDK already loaded');
      setSdkReady(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="cybrid-sdk-ui"]');
    if (existingScript) {
      console.log('🔧 Cybrid script exists, waiting for load...');
      const pollForSDK = setInterval(() => {
        if (window.customElements?.get('cybrid-app')) {
          console.log('✅ Cybrid SDK loaded from existing script');
          setSdkReady(true);
          clearInterval(pollForSDK);
        }
      }, 100);
      
      setTimeout(() => clearInterval(pollForSDK), 10000);
      return;
    }

    // Load from working CDN (jsDelivr) since node_modules serving has issues
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@cybrid/cybrid-sdk-ui-js@latest/cybrid-sdk-ui.min.js';
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('✅ Cybrid SDK loaded from CDN');
      // Poll for custom element registration
      const pollForSDK = setInterval(() => {
        if (window.customElements?.get('cybrid-app')) {
          console.log('✅ Cybrid SDK is ready');
          setSdkReady(true);
          clearInterval(pollForSDK);
        }
      }, 100);
      
      // Cleanup after 10 seconds
      setTimeout(() => {
        clearInterval(pollForSDK);
        if (!sdkReady) {
          console.error('❌ Cybrid SDK components not registered within timeout');
          setError('Failed to register Cybrid SDK components');
          onError?.('Failed to register Cybrid SDK components');
        }
      }, 10000);
    };

    script.onerror = () => {
      console.error('❌ Failed to load Cybrid SDK from CDN');
      setError('Failed to load Cybrid SDK');
      onError?.('Failed to load Cybrid SDK');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [sdkReady, onError]);

  // Initialize widget when all dependencies are ready
  useEffect(() => {
    if (sdkReady && effectiveCustomerId && cybridToken && !error) {
      console.log('🚀 All dependencies ready, initializing KYC widget...');
      initializeCybridWidget();
    }
  }, [sdkReady, effectiveCustomerId, cybridToken, error]);

  const initializeCybridWidget = () => {
    if (!cybridRef.current || !effectiveCustomerId || !cybridToken || !sdkReady) {
      console.log('⚠️ Missing dependencies for widget initialization:', {
        hasContainer: !!cybridRef.current,
        hasCustomerId: !!effectiveCustomerId,
        hasToken: !!cybridToken,
        sdkReady
      });
      return;
    }

    try {
      console.log('🔧 Initializing Cybrid NPM widget with:', {
        customerId: effectiveCustomerId,
        tokenPresent: !!(cybridToken as any)?.accessToken,
        tokenLength: (cybridToken as any)?.accessToken?.length || 0
      });

      // Clear existing content
      cybridRef.current.innerHTML = '';

      // Create cybrid-app element using the NPM package
      const cybridApp = document.createElement('cybrid-app');

      // Configure the widget for KYC verification  
      const config = {
        refreshInterval: 10000,
        routing: false,
        locale: 'en-US',
        theme: 'LIGHT',
        customer: effectiveCustomerId,
        fiat: 'USD',
        features: ['kyc_identity_verifications'],
        environment: 'sandbox'
      };
      
      console.log('🔧 NPM Widget configuration:', {
        customer: effectiveCustomerId,
        features: config.features,
        environment: config.environment,
        tokenLength: (cybridToken as any)?.accessToken?.length
      });

      // Set properties in the correct order per Cybrid docs
      console.log('🔧 Setting NPM widget properties...');
      
      // 1. Set auth token
      (cybridApp as any).auth = (cybridToken as any)?.accessToken;
      console.log('✅ Auth token set');
      
      // 2. Set config
      (cybridApp as any).config = config;
      console.log('✅ Config set');
      
      // 3. Set component (triggers initialization)
      (cybridApp as any).component = 'identity-verification';
      console.log('✅ Component set - NPM widget should initialize now');

      // Add comprehensive error handling
      cybridApp.addEventListener('error', (event: any) => {
        console.error('🚨 Cybrid NPM widget error:', event);
        const errorMessage = event.detail?.message || event.detail?.error || 'Unknown widget error';
        setError(`Widget error: ${errorMessage}`);
        onError?.(errorMessage);
      });

      // Listen for verification events
      cybridApp.addEventListener('verification-complete', (event: any) => {
        console.log('✅ KYC verification completed:', event.detail);
        setWidgetLoaded(true);
        setError(null);
        onVerificationComplete?.(event.detail?.status || 'completed');
      });

      cybridApp.addEventListener('verification-error', (event: any) => {
        console.error('❌ KYC verification error:', event.detail);
        const errorMessage = event.detail?.message || 'Verification failed';
        setError(errorMessage);
        onError?.(errorMessage);
      });

      // Listen for widget load events
      cybridApp.addEventListener('load', () => {
        console.log('✅ Cybrid widget loaded successfully');
        setWidgetLoaded(true);
        setError(null);
      });

      cybridApp.addEventListener('ready', () => {
        console.log('✅ Cybrid widget ready');
        setWidgetLoaded(true);
        setError(null);
      });

      // Append to container
      cybridRef.current.appendChild(cybridApp);
      
      // Set initial state
      setError(null);
      
      console.log('🎯 NPM Cybrid widget appended to DOM');

    } catch (err) {
      console.error('💥 Failed to initialize Cybrid NPM widget:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize verification widget';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const retryInitialization = () => {
    console.log('🔄 Retrying KYC widget initialization...');
    setError(null);
    setWidgetLoaded(false);
    setSdkReady(false);
    // This will trigger the useEffect to check SDK again
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

          {!sdkReady && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading Cybrid SDK...</span>
              </div>
            </div>
          )}

          {sdkReady && !widgetLoaded && (
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