import { useState, useEffect } from "react"
import { Key, Save, Eye, EyeOff, AlertTriangle, CheckCircle, ExternalLink, Globe, Shield, TestTube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"

export function ManageIntegrations() {
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  // Fetch existing Transak credentials from backend
  const { data: existingTransakCredentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ['/api/merchant/credentials/transak'],
  })

  // Stored credentials state
  const [transakCredentials, setTransakCredentials] = useState({
    apiKey: "",
    apiSecret: "", 
    environment: "staging"
  })

  // Update local state when credentials are loaded
  useEffect(() => {
    if (existingTransakCredentials) {
      setTransakCredentials(prev => ({
        ...prev,
        environment: (existingTransakCredentials as any).environment || 'staging'
        // API key and secret remain empty for security - only show if they exist
      }))
    }
  }, [existingTransakCredentials])

  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})

  // Integration status and configuration
  const [integrationEnabled, setIntegrationEnabled] = useState({
    transak: true
  })

  // Integration status based on fetched credentials
  const integrationStatus = {
    transak: {
      connected: (existingTransakCredentials as any)?.hasApiKey && (existingTransakCredentials as any)?.hasApiSecret,
      lastTest: (existingTransakCredentials as any)?.createdAt ? new Date((existingTransakCredentials as any).createdAt).toLocaleString() : "Never",
      status: isLoadingCredentials ? "loading" : ((existingTransakCredentials as any)?.isActive ? "operational" : "inactive"),
      supportedCountries: 95,
      supportedCurrencies: 45
    }
  }

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const handleTransakChange = (field: string, value: string) => {
    setTransakCredentials(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(prev => ({ ...prev, transak: true }))
  }

  // Mutation for saving Transak credentials
  const saveTransakMutation = useMutation({
    mutationFn: async (credentials: { apiKey: string; apiSecret: string; environment: string }) => {
      const response = await apiRequest('POST', '/api/merchant/credentials/transak', credentials)
      return await response.json()
    },
    onSuccess: () => {
      setUnsavedChanges(prev => ({ ...prev, transak: false }))
      // Clear sensitive data from state for security
      setTransakCredentials(prev => ({
        ...prev,
        apiKey: "",
        apiSecret: ""
      }))
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/credentials/transak'] })
      toast({
        title: "Transak Credentials Saved",
        description: "Your Transak API credentials have been securely stored.",
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

  const saveTransakCredentials = () => {
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
    if (!(existingTransakCredentials as any)?.hasApiKey && (!transakCredentials.apiKey || !transakCredentials.apiSecret)) {
      toast({
        title: "Missing Information",
        description: "Please provide both API key and API secret for initial setup",
        variant: "destructive"
      })
      return
    }
    
    saveTransakMutation.mutate(payload)
  }


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

  const testTransakConnection = () => {
    testTransakMutation.mutate()
  }

  const handleToggleIntegration = (integration: 'transak', enabled: boolean) => {
    setIntegrationEnabled(prev => ({ ...prev, [integration]: enabled }))
    
    toast({
      title: enabled ? "Integration enabled" : "Integration disabled",
      description: `${integration} integration has been ${enabled ? 'enabled' : 'disabled'}.`,
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      operational: { variant: "default" as const, icon: CheckCircle, text: "Operational" },
      warning: { variant: "secondary" as const, icon: AlertTriangle, text: "Warning" },
      error: { variant: "destructive" as const, icon: AlertTriangle, text: "Error" }
    }
    const config = variants[status as keyof typeof variants] || variants.operational
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Integrations</h1>
        <p className="text-muted-foreground">
          Configure your Transak integration for fiat-to-crypto payment functionality. Cybrid integration is fully automated.
        </p>
      </div>

      {/* Cybrid Status Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Shield className="h-5 w-5" />
            Cybrid Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700 dark:text-green-300 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span><strong>Cybrid integration is automatically managed</strong> - No manual configuration required</span>
          </div>
          <p className="mt-2 text-xs">
            Your crypto wallet accounts, KYC verification, and payment processing are handled automatically through our secure Cybrid integration.
          </p>
        </CardContent>
      </Card>

      {/* Integration Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Transak</CardTitle>
              <CardDescription>Fiat-to-crypto gateway</CardDescription>
            </div>
          </div>
          <Switch 
            checked={integrationEnabled.transak}
            onCheckedChange={(checked) => handleToggleIntegration('transak', checked)}
            data-testid="switch-transak-enabled"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              {getStatusBadge(integrationStatus.transak.status)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Connected</span>
              {integrationStatus.transak.connected ? (
                <Badge variant="default" className="text-xs">Yes</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">No</Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Countries</span>
              <span className="text-sm font-medium">{integrationStatus.transak.supportedCountries}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Currencies</span>
              <span className="text-sm font-medium">{integrationStatus.transak.supportedCurrencies}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Getting Started with Transak
          </CardTitle>
          <CardDescription>
            Follow these steps to obtain your Transak API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Transak Setup
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
        </CardContent>
      </Card>

      {/* Transak Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Transak API Credentials
            </CardTitle>
            <CardDescription>
              Configure your Transak integration for fiat-to-crypto onramp/offramp
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testTransakConnection}
              data-testid="button-test-transak"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <Button
              onClick={saveTransakCredentials}
              disabled={!unsavedChanges.transak}
              size="sm"
              data-testid="button-save-transak"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
          
          {unsavedChanges.transak && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              You have unsaved changes
            </div>
          )}
        </CardContent>
      </Card>


      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-5 w-5" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700 dark:text-yellow-300 text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Never share your API secrets with unauthorized parties</li>
            <li>Use production credentials only in production environments</li>
            <li>Regularly rotate your API keys for enhanced security</li>
            <li>Monitor API usage for suspicious activity</li>
            <li>Store credentials securely and never commit them to version control</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}