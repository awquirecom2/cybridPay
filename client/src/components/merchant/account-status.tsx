import { useState, useEffect } from "react"
import { CheckCircle, Clock, AlertTriangle, ExternalLink, Shield, Wallet, CreditCard, User, Building, Eye, EyeOff, Save, Globe, Plus, Copy, Settings, Loader2, Key, TestTube } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { KycNotificationBanner } from "./kyc-notification-banner"

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

interface DepositAddress {
  created_at: string;
  updated_at: string;
  guid: string;
  bank_guid: string;
  customer_guid: string;
  account_guid: string;
  asset: string;
  state: string;
  address: string;
  format: string;
  labels: string[];
}

interface DepositAddressesResponse {
  success: boolean;
  addresses: DepositAddress[];
}

export function AccountStatus() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [transakCredentials, setTransakCredentials] = useState({
    apiKey: "",
    apiSecret: "",
    environment: "staging"
  })
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [isCreatingCustodian, setIsCreatingCustodian] = useState(false)
  const [isConnectingBank, setIsConnectingBank] = useState(false)

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

  const { data: transakData, isLoading: isLoadingTransak } = useQuery({
    queryKey: ['/api/merchant/credentials-v2/transak'],
  })

  // Update local state when credentials are loaded
  useEffect(() => {
    if (transakData) {
      setTransakCredentials(prev => ({
        ...prev,
        environment: (transakData as any).environment || 'staging'
        // API key and secret remain empty for security - only show if they exist
      }))
    }
  }, [transakData])

  // Mutation for saving Transak credentials (v2 uses Secret Manager)
  const saveTransakMutation = useMutation({
    mutationFn: async (credentials: { apiKey: string; apiSecret: string; environment: string }) => {
      const response = await apiRequest('POST', '/api/merchant/credentials-v2/transak', credentials)
      return await response.json()
    },
    onSuccess: () => {
      setUnsavedChanges(false)
      // Clear sensitive data from state for security
      setTransakCredentials(prev => ({
        ...prev,
        apiKey: "",
        apiSecret: ""
      }))
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/credentials-v2/transak'] })
      toast({
        title: "Transak Credentials Saved",
        description: "Your Transak API credentials have been securely stored in Google Secret Manager.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save Transak credentials",
        variant: "destructive"
      })
    }
  })

  // Mutation for testing Transak connection
  const testTransakMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/transak/access-token')
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful",
        description: `Successfully connected to Transak API. Token expires in ${data.expiresIn} seconds.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Transak API. Please check your credentials.",
        variant: "destructive"
      })
    }
  })

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const handleTransakChange = (field: string, value: string) => {
    setTransakCredentials(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleTransakSave = () => {
    // Build payload with only fields that have values
    const payload: any = {
      environment: transakCredentials.environment
    }
    
    // Only include credentials if they are provided (allows environment-only updates)
    if (transakCredentials.apiKey) {
      payload.apiKey = transakCredentials.apiKey
    }
    if (transakCredentials.apiSecret) {
      payload.apiSecret = transakCredentials.apiSecret
    }
    
    // For new integrations, require both credentials
    if (!(transakData as any)?.hasApiKey && (!transakCredentials.apiKey || !transakCredentials.apiSecret)) {
      toast({
        title: "Missing Information",
        description: "Please provide both API key and API secret for initial setup",
        variant: "destructive"
      })
      return
    }
    
    saveTransakMutation.mutate(payload)
  }

  const testTransakConnection = () => {
    testTransakMutation.mutate()
  }

  // Helper functions from Accounts page
  const handleCreateCustodianAccount = async () => {
    setIsCreatingCustodian(true)
    console.log('Creating crypto wallet account')
    
    // Simulate API call
    setTimeout(() => {
      setIsCreatingCustodian(false)
      toast({
        title: "Account Created",
        description: "Your crypto wallet account has been created successfully.",
      })
    }, 2000)
  }

  const handleConnectBankAccount = async () => {
    setIsConnectingBank(true)
    console.log('Connecting bank account')
    
    // Simulate API call  
    setTimeout(() => {
      setIsConnectingBank(false)
      toast({
        title: "Bank Connected",
        description: "Your bank account has been connected successfully.",
      })
    }, 2000)
  }

  const copyAddress = (address: string, currency: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Address Copied",
      description: `${currency} wallet address copied to clipboard.`,
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, icon: CheckCircle, text: "Active" },
      pending: { variant: "secondary" as const, icon: AlertTriangle, text: "Pending" },
      verified: { variant: "default" as const, icon: CheckCircle, text: "Verified" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Complete" },
      in_progress: { variant: "secondary" as const, icon: Clock, text: "In Progress" },
      error: { variant: "destructive" as const, icon: AlertTriangle, text: "Needs Attention" }
    }
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
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


  // Calculate automation status based on backend data
  const kycStatus = (kycData as any)?.status
  const walletHasAddresses = (depositAddressData as any)?.addresses && (depositAddressData as any)?.addresses.length > 0
  const transakConfigured = (transakData as any)?.hasApiKey && (transakData as any)?.hasApiSecret

  const automationSteps: StatusItem[] = [
    {
      title: "Identity Verification",
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
        onClick: () => {
          // Scroll to the Transak integration section
          const transakSection = document.getElementById('transak-integration-section')
          if (transakSection) {
            transakSection.scrollIntoView({ behavior: 'smooth' })
          }
        }
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
          <h1 className="text-3xl font-bold">Account Overview</h1>
          <p className="text-muted-foreground">Loading your account setup progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Overview</h1>
        <p className="text-muted-foreground">
          Track your automated merchant account setup progress and manage your crypto wallet infrastructure
        </p>
      </div>

      {/* KYC Notification Banner - Show when KYC is pending */}
      {kycStatus !== 'approved' && kycStatus !== 'in_review' && kycStatus !== 'rejected' && (
        <KycNotificationBanner />
      )}

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
              <Button variant="outline" onClick={() => setLocation("/merchant/offramp-crypto")} data-testid="button-offramp-crypto">
                Offramp Crypto
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

      {/* Wallet Account Details - Only show if wallet is set up */}
      {walletHasAddresses && (
        <>
          <Separator className="my-8" />
          

          {/* Cryptocurrency Wallets */}
          <Card>
            <CardHeader>
              <CardTitle>Cryptocurrency Wallets</CardTitle>
              <CardDescription>
                Your individual deposit addresses for different cryptocurrencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(depositAddressData as any)?.addresses?.length > 0 ? (
                <div className="space-y-4">
                  {(depositAddressData as any).addresses.map((address: DepositAddress) => (
                    <div key={address.guid} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{address.asset}</div>
                          <Badge variant="outline" className="text-xs">
                            {address.asset === 'BTC' ? 'Bitcoin' : 'Ethereum'}
                          </Badge>
                          {address.state === 'created' && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {address.address}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(address.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyAddress(address.address, address.asset)}
                          data-testid={`button-copy-address-${address.asset.toLowerCase()}`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4" />
                  <p>No deposit addresses found</p>
                  <p className="text-sm">Deposit addresses will appear here once your account is fully set up</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transak Integration Section */}
          <Card id="transak-integration-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Transak Payment Integration
              </CardTitle>
              <CardDescription>
                Configure fiat-to-crypto payment gateway for your customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Integration Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Status</div>
                  {transakConfigured ? (
                    <Badge variant="default" className="flex items-center gap-1 justify-center">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1 justify-center">
                      <AlertTriangle className="h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Environment</div>
                  <div className="text-sm font-medium capitalize">{(transakData as any)?.environment || 'Not Set'}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="text-sm">
                    {(transakData as any)?.createdAt ? new Date((transakData as any).createdAt).toLocaleDateString() : "Never"}
                  </div>
                </div>
              </div>

              {/* Setup Instructions */}
              {!transakConfigured && (
                <div className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950 p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Getting Started with Transak
                    </h3>
                    <div className="text-sm space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p>Create account at <strong>dashboard.transak.com</strong></p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p>Submit KYB form for production access</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p>Go to <strong>Developers</strong> section in dashboard</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <p>Copy your <strong>API Key</strong> and <strong>API Secret</strong></p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild data-testid="button-transak-dashboard">
                      <a href="https://dashboard.transak.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Transak Dashboard
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">API Configuration</h3>
                  <div className="flex gap-2">
                    {transakConfigured && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testTransakConnection}
                        disabled={testTransakMutation.isPending}
                        data-testid="button-test-transak"
                      >
                        {testTransakMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Environment Selection */}
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select 
                      value={transakCredentials.environment} 
                      onValueChange={(value) => handleTransakChange('environment', value)}
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

                  <div className="flex items-end">
                    {transakCredentials.environment === 'production' ? (
                      <Badge variant="default" className="h-fit">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="h-fit">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Test
                      </Badge>
                    )}
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      value={transakCredentials.apiKey}
                      onChange={(e) => handleTransakChange('apiKey', e.target.value)}
                      placeholder="pk_live_..."
                      className="font-mono text-sm"
                      data-testid="input-transak-api-key"
                    />
                  </div>

                  {/* API Secret */}
                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecrets.transak_secret ? "text" : "password"}
                        value={transakCredentials.apiSecret}
                        onChange={(e) => handleTransakChange('apiSecret', e.target.value)}
                        placeholder="sk_live_..."
                        className="font-mono text-sm"
                        data-testid="input-transak-api-secret"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecretVisibility('transak_secret')}
                        data-testid="button-toggle-transak-secret"
                      >
                        {showSecrets.transak_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {unsavedChanges && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    You have unsaved changes
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleTransakSave}
                    disabled={!unsavedChanges || saveTransakMutation.isPending}
                    size="sm"
                    data-testid="button-save-transak"
                  >
                    {saveTransakMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saveTransakMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Security Best Practices
                </div>
                <div className="text-yellow-700 dark:text-yellow-300 text-sm mt-2 space-y-1">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Never share your API secrets with unauthorized parties</li>
                    <li>Use production credentials only in production environments</li>
                    <li>Regularly rotate your API keys for enhanced security</li>
                    <li>Monitor API usage for suspicious activity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Bank Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Connected Bank Accounts</CardTitle>
                <CardDescription>
                  Bank accounts for ACH and Wire payouts
                </CardDescription>
              </div>
              <Button 
                onClick={handleConnectBankAccount}
                disabled={isConnectingBank}
                data-testid="button-connect-bank"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isConnectingBank ? "Connecting..." : "Connect Bank"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6 text-muted-foreground">
                <p>No bank accounts connected yet</p>
                <p className="text-sm">Connect a bank account to enable ACH and Wire payouts</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Actions
              </CardTitle>
              <CardDescription>
                Manage your account settings and security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Account Details
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Security & Compliance Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  )
}