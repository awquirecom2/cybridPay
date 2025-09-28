import { useState, useEffect } from "react"
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { ManualKycVerification } from "./manual-kyc-verification"

export function KybOnboarding() {
  const { toast } = useToast()
  
  // Get KYC status from API - no polling needed since webhooks update status real-time
  const { data: kycStatus, isLoading: kycLoading, error: kycError, refetch: refetchKycStatus } = useQuery({
    queryKey: ['/api/cybrid/kyc-status'],
    staleTime: 30000 // Cache for 30 seconds since webhooks handle real-time updates
  })
  
  // Map API status to component status with proper type checking
  const apiStatus = (kycStatus as any)?.status
  const kycVerificationStatus = apiStatus === 'approved' ? 'completed' :
                                apiStatus === 'rejected' ? 'failed' :
                                'pending'
  
  // Handle API errors with useEffect to avoid infinite re-renders
  useEffect(() => {
    if (kycError && !kycLoading) {
      toast({
        title: "Status Check Failed",
        description: "Unable to check verification status. Please try again.",
        variant: "destructive"
      });
    }
  }, [kycError, kycLoading, toast]);
  
  const form = useForm({
    defaultValues: {
      directorName: "",
      directorEmail: "",
      directorPhone: ""
    }
  })

  // TODO: remove mock functionality - replace with real KYB submission
  const kybSteps = [
    { id: 1, title: "Document Upload", status: "current" },
    { id: 2, title: "Director Verification", status: "pending" },
    { id: 3, title: "Review & Submit", status: "pending" }
  ]




  const getStepStatus = (stepId: number) => {
    if (kycVerificationStatus === 'completed') {
      return "completed"
    }
    return "current"
  }




  const handleKycComplete = (status: string) => {
    console.log('KYC verification completed with status:', status);
    
    // Invalidate and refetch KYC status to get latest data from list endpoint
    queryClient.invalidateQueries({ queryKey: ['/api/cybrid/kyc-status'] });
    refetchKycStatus();
    
    if (status === 'passed' || status === 'approved') {
      toast({
        title: "Identity Verification Complete",
        description: "Your identity has been successfully verified.",
      });
    } else {
      toast({
        title: "Identity Verification Failed", 
        description: "Please contact support if you need assistance.",
        variant: "destructive"
      });
    }
  };

  const handleKycError = (error: string) => {
    console.error('KYC verification error:', error);
    
    // Invalidate cache to trigger status refresh
    queryClient.invalidateQueries({ queryKey: ['/api/cybrid/kyc-status'] });
    
    toast({
      title: "Verification Error",
      description: error,
      variant: "destructive"
    });
  };

  const renderDirectorInfo = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Director Information</CardTitle>
          <CardDescription>
            Provide basic details and complete identity verification for the business director
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FormField
                control={form.control}
                name="directorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} data-testid="input-director-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="directorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="john@company.com" type="email" {...field} data-testid="input-director-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="directorPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-director-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      {kycVerificationStatus === 'completed' ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Identity Verification Complete</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your identity has been successfully verified and meets regulatory requirements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ManualKycVerification
            onVerificationComplete={handleKycComplete}
            data-testid="manual-kyc-verification"
          />

          {kycVerificationStatus === 'failed' && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Identity Verification Failed</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Please contact support for assistance with identity verification.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )

  const renderReview = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
          Please review your information before submitting for approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Identity Verification</h3>
            <div className="text-sm">
              <div>Your business information has been collected through the identity verification process.</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Verification Status</h3>
            <div className="text-sm">
              {kycVerificationStatus === 'completed' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Identity verification completed successfully</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span>Identity verification pending</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Next Steps</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {kycVerificationStatus === 'completed' ? 'Your verification is complete. You can now access all platform features.' : 'Please complete identity verification to access all platform features.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KYB Onboarding</h1>
        <p className="text-muted-foreground">
          Complete your Know Your Business verification to access all platform features
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Identity Verification</span>
              <span>{kycVerificationStatus === 'completed' ? '100% Complete' : 'In Progress'}</span>
            </div>
            <Progress value={kycVerificationStatus === 'completed' ? 100 : 50} className="w-full" />
            
            <div className="flex justify-between">
              {kybSteps.map((step) => (
                <div key={step.id} className="flex flex-col items-center text-center max-w-[120px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    getStepStatus(step.id) === 'completed' ? 'bg-green-600 text-white' :
                    getStepStatus(step.id) === 'current' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {getStepStatus(step.id) === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : getStepStatus(step.id) === 'current' ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {kycVerificationStatus !== 'completed' && renderDirectorInfo()}
      {kycVerificationStatus === 'completed' && renderReview()}

    </div>
  )
}