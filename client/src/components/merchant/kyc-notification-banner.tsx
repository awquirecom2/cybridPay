import { useState } from 'react';
import { X, Shield, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface KycNotificationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export function KycNotificationBanner({ onDismiss, className }: KycNotificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [, setLocation] = useLocation();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleStartVerification = () => {
    setLocation('/merchant/onboarding');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert 
      className={cn(
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-200/20 dark:bg-amber-950/10 dark:text-amber-200",
        "relative mb-6 p-4",
        className
      )}
      data-testid="notification-kyc-banner"
    >
      {/* Icon */}
      <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      
      {/* Content */}
      <div className="flex items-center justify-between pl-7">
        <div className="flex-1">
          <AlertDescription className="text-sm font-medium mb-1">
            Identity Verification Required
          </AlertDescription>
          <AlertDescription className="text-sm opacity-90">
            Complete your identity verification to unlock all platform features including crypto payments and wallet setup.
          </AlertDescription>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 ml-4">
          <Button
            onClick={handleStartVerification}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
            data-testid="button-start-verification"
          >
            Start Verification
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-900/20"
            data-testid="button-dismiss-notification"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss notification</span>
          </Button>
        </div>
      </div>
    </Alert>
  );
}