import { useState } from "react"
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
import { CybridKycWidget } from "./cybrid-kyc-widget"

export function KybOnboarding() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [kycVerificationStatus, setKycVerificationStatus] = useState<'pending' | 'completed' | 'failed'>('pending')
  
  const form = useForm({
    defaultValues: {
      businessName: "",
      businessAddress: "", 
      businessType: "",
      registrationNumber: "",
      taxId: "",
      website: "",
      description: "",
      directorName: "",
      directorEmail: "",
      directorPhone: ""
    }
  })

  // TODO: remove mock functionality - replace with real KYB submission
  const kybSteps = [
    { id: 1, title: "Business Information", status: "current" },
    { id: 2, title: "Document Upload", status: "pending" },
    { id: 3, title: "Director Verification", status: "pending" },
    { id: 4, title: "Review & Submit", status: "pending" }
  ]

  const requiredDocuments = [
    { id: "certificate", name: "Certificate of Incorporation", uploaded: false },
    { id: "articles", name: "Articles of Association", uploaded: false },
    { id: "proof-address", name: "Proof of Business Address", uploaded: false },
    { id: "director-id", name: "Director ID Document", uploaded: false }
  ]

  const handleFileUpload = (documentId: string, file: File) => {
    setUploadedFiles(prev => ({ ...prev, [documentId]: file }))
    console.log(`File uploaded for ${documentId}:`, file.name)
    toast({
      title: "Document uploaded",
      description: `${file.name} has been uploaded successfully.`,
    })
  }

  const handleStepSubmit = () => {
    // Step 3 validation: Require KYC completion before proceeding
    if (currentStep === 3 && kycVerificationStatus !== 'completed') {
      toast({
        title: "Identity Verification Required",
        description: "Please complete identity verification before proceeding.",
        variant: "destructive"
      });
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
      console.log(`Step ${currentStep} completed, moving to step ${currentStep + 1}`)
      toast({
        title: "Step Completed",
        description: `Step ${currentStep} completed successfully.`
      });
    } else {
      console.log('KYB submission completed')
      toast({
        title: "KYB Submitted",
        description: "Your KYB application has been submitted for review.",
      })
    }
  }

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed"
    if (stepId === currentStep) return "current"
    return "pending"
  }

  const canProceedFromStep = (stepNumber: number) => {
    if (stepNumber === 3) {
      return kycVerificationStatus === 'completed';
    }
    return true;
  }

  const renderBusinessInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>
          Provide details about your business entity and registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company Inc" {...field} data-testid="input-business-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type *</FormLabel>
                  <FormControl>
                    <Input placeholder="LLC, Corporation, Partnership" {...field} data-testid="input-business-type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678" {...field} data-testid="input-registration-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID / EIN *</FormLabel>
                  <FormControl>
                    <Input placeholder="XX-XXXXXXX" {...field} data-testid="input-tax-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Business St, City, State, ZIP, Country" 
                        {...field} 
                        data-testid="textarea-business-address" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourcompany.com" {...field} data-testid="input-website" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your business activities and how you plan to use cryptocurrency payments" 
                        {...field} 
                        data-testid="textarea-business-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  )

  const renderDocumentUpload = () => (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload the required business documents for verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requiredDocuments.map((doc) => (
            <div key={doc.id} className="border border-dashed border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{doc.name}</span>
                </div>
                {uploadedFiles[doc.id] && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Uploaded
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mb-3">
                Accepted formats: PDF, JPG, PNG (max 10MB)
              </div>
              
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(doc.id, file)
                }}
                className="hidden"
                id={`upload-${doc.id}`}
                data-testid={`input-upload-${doc.id}`}
              />
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById(`upload-${doc.id}`)?.click()}
                  data-testid={`button-upload-${doc.id}`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadedFiles[doc.id] ? 'Replace File' : 'Choose File'}
                </Button>
                
                {uploadedFiles[doc.id] && (
                  <span className="text-sm text-muted-foreground">
                    {uploadedFiles[doc.id].name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const handleKycComplete = (status: string) => {
    console.log('KYC verification completed with status:', status);
    if (status === 'passed' || status === 'approved') {
      setKycVerificationStatus('completed');
      toast({
        title: "Identity Verification Complete",
        description: "Your identity has been successfully verified.",
      });
    } else {
      setKycVerificationStatus('failed');
      toast({
        title: "Identity Verification Failed", 
        description: "Please contact support if you need assistance.",
        variant: "destructive"
      });
    }
  };

  const handleKycError = (error: string) => {
    console.error('KYC verification error:', error);
    setKycVerificationStatus('failed');
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

      <CybridKycWidget
        onVerificationComplete={handleKycComplete}
        onError={handleKycError}
        data-testid="cybrid-kyc-widget"
      />

      {kycVerificationStatus === 'completed' && (
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
      )}

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
            <h3 className="font-semibold mb-2">Business Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {form.getValues('businessName') || 'Not provided'}</div>
              <div><span className="text-muted-foreground">Type:</span> {form.getValues('businessType') || 'Not provided'}</div>
              <div><span className="text-muted-foreground">Registration:</span> {form.getValues('registrationNumber') || 'Not provided'}</div>
              <div><span className="text-muted-foreground">Tax ID:</span> {form.getValues('taxId') || 'Not provided'}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Documents</h3>
            <div className="space-y-1">
              {requiredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm">
                  {uploadedFiles[doc.id] ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{doc.name}</span>
                  {uploadedFiles[doc.id] && (
                    <span className="text-muted-foreground">({uploadedFiles[doc.id].name})</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Director Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {form.getValues('directorName') || 'Not provided'}</div>
              <div><span className="text-muted-foreground">Email:</span> {form.getValues('directorEmail') || 'Not provided'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {form.getValues('directorPhone') || 'Not provided'}</div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Review Timeline</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Your KYB application will be reviewed within 3-5 business days. You'll receive email updates on the status.
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
              <span>Step {currentStep} of {kybSteps.length}</span>
              <span>{Math.round((currentStep / kybSteps.length) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / kybSteps.length) * 100} className="w-full" />
            
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
      {currentStep === 1 && renderBusinessInfo()}
      {currentStep === 2 && renderDocumentUpload()}
      {currentStep === 3 && renderDirectorInfo()}
      {currentStep === 4 && renderReview()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          data-testid="button-previous-step"
        >
          Previous
        </Button>
        
        <Button 
          onClick={handleStepSubmit}
          data-testid="button-next-step"
        >
          {currentStep === 4 ? 'Submit for Review' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}