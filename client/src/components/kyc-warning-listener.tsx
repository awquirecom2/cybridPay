import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

export function KycWarningListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleKycWarning = (event: CustomEvent) => {
      const { message, onboardingUrl } = event.detail;
      
      toast({
        title: "Identity Verification Required",
        description: (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{message}</span>
          </div>
        ),
        action: (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                window.location.href = onboardingUrl;
              }}
              data-testid="button-kyc-warning-complete"
            >
              Complete Verification
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                // Mark as dismissed in session storage
                sessionStorage.setItem('kyc_warning_dismissed', 'true');
              }}
              data-testid="button-kyc-warning-dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ),
        duration: 10000, // Show for 10 seconds
      });
    };

    // Listen for the custom event
    window.addEventListener('kycWarningRequired', handleKycWarning as EventListener);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('kycWarningRequired', handleKycWarning as EventListener);
    };
  }, [toast]);

  // This component doesn't render anything, it just listens for events
  return null;
}