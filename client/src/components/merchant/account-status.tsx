import { useState } from "react"
import { CheckCircle, Clock, AlertTriangle, ExternalLink, Shield, Wallet, CreditCard, User, Building, Eye, EyeOff, Save, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"

interface StatusItem {
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  details?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function AccountStatus() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [isTransakDialogOpen, setIsTransakDialogOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [transakCredentials, setTransakCredentials] = useState({
    apiKey: "",
    apiSecret: "",
    environment: "staging"
  })

  // Fetch merchant status from backend
  const { data: merchantData, isLoading } = useQuery({
    queryKey: ['/api/merchant/profile'],
  })

  const { data: kycData } = useQuery({
    queryKey: ['/api/cybrid/kyc-status'],
  })

  const { data: depositAddressData } = useQuery({
    queryKey: ['/api/merchant/deposit-addresses'],
  })

  const { data: transakData } = useQuery({
    queryKey: ['/api/merchant/credentials/transak'],
  })

  // Mutation for saving Transak credentials
  const saveTransakMutation = useMutation({
    mutationFn: async (credentials: { apiKey: string; apiSecret: string; environment: string }) => {
      const response = await apiRequest('POST', '/api/merchant/credentials/transak', credentials)
      return await response.json()
    },
    onSuccess: () => {
      setTransakCredentials({
        apiKey: "",
        apiSecret: "",
        environment: "staging"
      })
      setIsTransakDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/credentials/transak'] })
      toast({
        title: "Payment Gateway Configured",
        description: "Your Transak payment gateway has been successfully configured.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to save payment gateway credentials",
        variant: "destructive"
      })
    }
  })

  const handleTransakSave = () => {
    if (!transakCredentials.apiKey || !transakCredentials.apiSecret) {
      toast({
        title: "Missing Information",
        description: "Please provide both API key and API secret",
        variant: "destructive"
      })
      return
    }
    saveTransakMutation.mutate(transakCredentials)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      completed: { variant: "default" as const, text: "Complete" },
      in_progress: { variant: "secondary" as const, text: "In Progress" },
      error: { variant: "destructive" as const, text: "Needs Attention" },
      pending: { variant: "outline" as const, text: "Pending" }
    }
    const config = configs[status as keyof typeof configs] || configs.pending
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  // Calculate automation status based on backend data
  const kycStatus = (kycData as any)?.status
  const walletHasAddresses = (depositAddressData as any)?.addresses && (depositAddressData as any)?.addresses.length > 0
  const transakConfigured = (transakData as any)?.hasApiKey && (transakData as any)?.hasApiSecret

  const automationSteps: StatusItem[] = [
    {
      title: "KYC Verification",
      description: "Identity verification for regulatory compliance",
      status: kycStatus === 'approved' ? 'completed' : 
              kycStatus === 'in_review' ? 'in_progress' : 
              kycStatus === 'rejected' ? 'error' : 'pending',
      details: kycStatus === 'approved' 
        ? "Your identity has been verified successfully" 
        : kycStatus === 'in_review'
        ? "Your KYC submission is under review"
        : kycStatus === 'rejected'
        ? "KYC verification needs additional information"
        : "Complete your KYC verification to proceed",
      action: kycStatus !== 'approved' ? {
        label: "Complete KYC",
        onClick: () => setLocation("/merchant/onboarding")
      } : undefined
    },
    {
      title: "Wallet Account Setup",
      description: "Secure cryptocurrency wallet infrastructure",
      status: walletHasAddresses ? 'completed' : 
              kycStatus === 'approved' ? 'in_progress' : 'pending',
      details: walletHasAddresses
        ? "Your crypto wallet is ready to receive payments"
        : kycStatus === 'approved'
        ? "Setting up your secure wallet infrastructure"
        : "Wallet will be created after KYC approval"
    },
    {
      title: "Payment Integration",
      description: "Fiat-to-crypto payment gateway configuration",
      status: transakConfigured ? 'completed' : 'pending',
      details: transakConfigured
        ? "Payment gateway is configured and ready"
        : "Configure your payment gateway credentials (optional)",
      action: !transakConfigured ? {
        label: "Setup Payment Gateway",
        onClick: () => setIsTransakDialogOpen(true)
      } : undefined
    }
  ]

  const completedSteps = automationSteps.filter(step => step.status === 'completed').length
  const totalSteps = automationSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const overallStatus = completedSteps === totalSteps ? 'completed' : 
                       automationSteps.some(step => step.status === 'in_progress') ? 'in_progress' :
                       automationSteps.some(step => step.status === 'error') ? 'needs_attention' : 'setup_required'

  const getOverallStatusConfig = () => {
    switch (overallStatus) {
      case 'completed':
        return {
          title: "Account Ready",
          description: "Your merchant account is fully configured and ready to receive payments",
          color: "text-green-700 dark:text-green-300",
          bgColor: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
        }
      case 'in_progress':
        return {
          title: "Setup In Progress",
          description: "Your account is being configured automatically",
          color: "text-blue-700 dark:text-blue-300",
          bgColor: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
        }
      case 'needs_attention':
        return {
          title: "Action Required",
          description: "Some setup steps need your attention",
          color: "text-orange-700 dark:text-orange-300",
          bgColor: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
        }
      default:
        return {
          title: "Setup Required",
          description: "Complete the setup steps to start receiving payments",
          color: "text-gray-700 dark:text-gray-300",
          bgColor: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
        }
    }
  }

  const statusConfig = getOverallStatusConfig()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Status</h1>
          <p className="text-muted-foreground">Loading your account setup progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Status</h1>
        <p className="text-muted-foreground">
          Track your automated merchant account setup progress
        </p>
      </div>

      {/* Overall Status Card */}
      <Card className={statusConfig.bgColor}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`flex items-center gap-2 ${statusConfig.color}`}>
                {getStatusIcon(overallStatus === 'needs_attention' ? 'error' : overallStatus)}
                {statusConfig.title}
              </CardTitle>
              <CardDescription className={statusConfig.color}>
                {statusConfig.description}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{completedSteps}/{totalSteps}</div>
              <div className="text-sm text-muted-foreground">Steps Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Automation Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Setup Steps</h2>
        
        {automationSteps.map((step, index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700">
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(step.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{step.details}</p>
                {step.action && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={step.action.onClick}
                    data-testid={`button-${step.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {step.action.label}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {overallStatus === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ready to Accept Payments
            </CardTitle>
            <CardDescription>
              Your account is fully configured. Start receiving crypto payments now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/merchant/receive-crypto")} data-testid="button-receive-crypto">
                View Payment Links
              </Button>
              <Button variant="outline" onClick={() => setLocation("/merchant/accounts")} data-testid="button-view-accounts">
                Manage Accounts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Shield className="h-5 w-5" />
            Automated Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 dark:text-blue-300 text-sm">
          <p>
            Your merchant account setup is handled automatically. Once you complete KYC verification, 
            your wallet infrastructure will be created within minutes. Our system handles all the technical 
            configuration so you can focus on your business.
          </p>
          {overallStatus !== 'completed' && (
            <div className="mt-3">
              <p className="font-medium">Need help?</p>
              <p>Contact our support team if you have questions about the setup process.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transak Configuration Dialog */}
      <Dialog open={isTransakDialogOpen} onOpenChange={setIsTransakDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Configure Payment Gateway
            </DialogTitle>
            <DialogDescription>
              Set up your Transak credentials to enable fiat-to-crypto payments for your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select 
                value={transakCredentials.environment} 
                onValueChange={(value) => setTransakCredentials(prev => ({ ...prev, environment: value }))}
              >
                <SelectTrigger data-testid="select-transak-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={transakCredentials.apiKey}
                onChange={(e) => setTransakCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="pk_live_..."
                className="font-mono text-sm"
                data-testid="input-transak-api-key"
              />
            </div>
            <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets ? "text" : "password"}
                  value={transakCredentials.apiSecret}
                  onChange={(e) => setTransakCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                  placeholder="sk_live_..."
                  className="font-mono text-sm"
                  data-testid="input-transak-api-secret"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets(!showSecrets)}
                  data-testid="button-toggle-transak-secret"
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Get your credentials from the <a href="https://dashboard.transak.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Transak Dashboard</a></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransakDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransakSave} 
              disabled={saveTransakMutation.isPending}
              data-testid="button-save-transak"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveTransakMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}