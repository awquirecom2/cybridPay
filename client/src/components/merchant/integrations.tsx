import { useState } from "react"
import { Globe, Link as LinkIcon, CheckCircle, AlertTriangle, Settings, TestTube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export function Integrations() {
  const { toast } = useToast()
  const [transakConfig, setTransakConfig] = useState({
    apiKey: "transak_api_1234567890abcdef",
    partnerSecret: "transak_secret_abcdef1234567890",
    environment: "staging",
    enabled: true
  })

  const [cybridConfig, setCybridConfig] = useState({
    customerToken: "cybrid_customer_token_1234567890",
    plaidConnected: true,
    depositAddress: "0x742d35Cc6Bf05322B38d82E73456789abcdef123",
    environment: "sandbox", 
    enabled: true
  })

  // TODO: remove mock functionality - replace with real integration status
  const integrationStatus = {
    transak: {
      connected: true,
      lastTest: "2024-01-21 14:30:00",
      status: "operational",
      supportedCountries: 95,
      supportedCurrencies: 45
    },
    cybrid: {
      connected: true,
      lastTest: "2024-01-21 14:25:00", 
      status: "operational",
      tradingAccounts: 2,
      kycStatus: "approved"
    }
  }

  const handleTestConnection = (integration: string) => {
    console.log(`Testing ${integration} connection`)
    toast({
      title: "Connection test initiated",
      description: `Testing ${integration} integration connectivity...`,
    })
    
    // Simulate connection test
    setTimeout(() => {
      toast({
        title: "Connection test successful",
        description: `${integration} integration is working correctly.`,
      })
    }, 2000)
  }

  const handleSaveConfig = (integration: string) => {
    console.log(`Saving ${integration} configuration`)
    toast({
      title: "Configuration saved",
      description: `${integration} settings have been updated successfully.`,
    })
  }

  const handleToggleIntegration = (integration: string, enabled: boolean) => {
    console.log(`Toggling ${integration}:`, enabled)
    if (integration === 'transak') {
      setTransakConfig(prev => ({ ...prev, enabled }))
    } else if (integration === 'cybrid') {
      setCybridConfig(prev => ({ ...prev, enabled }))
    }
    
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
        <h1 className="text-3xl font-bold">Integration Setup</h1>
        <p className="text-muted-foreground">
          Configure Transak and Cybrid integrations for fiat-to-crypto payments
        </p>
      </div>

      {/* Integration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              checked={transakConfig.enabled}
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
                <span className="text-sm text-muted-foreground">Countries</span>
                <span className="text-sm font-medium">{integrationStatus.transak.supportedCountries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Currencies</span>
                <span className="text-sm font-medium">{integrationStatus.transak.supportedCurrencies}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Test</span>
                <span className="text-xs text-muted-foreground">{integrationStatus.transak.lastTest}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <LinkIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Cybrid</CardTitle>
                <CardDescription>Crypto infrastructure</CardDescription>
              </div>
            </div>
            <Switch 
              checked={cybridConfig.enabled}
              onCheckedChange={(checked) => handleToggleIntegration('cybrid', checked)}
              data-testid="switch-cybrid-enabled"
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(integrationStatus.cybrid.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trading Accounts</span>
                <span className="text-sm font-medium">{integrationStatus.cybrid.tradingAccounts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">KYC Status</span>
                <Badge variant="default" className="text-xs">Approved</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Test</span>
                <span className="text-xs text-muted-foreground">{integrationStatus.cybrid.lastTest}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transak" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transak" data-testid="tab-transak">Transak Configuration</TabsTrigger>
          <TabsTrigger value="cybrid" data-testid="tab-cybrid">Cybrid Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="transak" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Transak API Configuration
              </CardTitle>
              <CardDescription>
                Configure your Transak API credentials for fiat-to-crypto processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transak-api-key">API Key</Label>
                  <Input
                    id="transak-api-key"
                    value={transakConfig.apiKey}
                    onChange={(e) => setTransakConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="font-mono text-sm"
                    data-testid="input-transak-api-key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transak-secret">Partner Secret</Label>
                  <Input
                    id="transak-secret"
                    type="password"
                    value={transakConfig.partnerSecret}
                    onChange={(e) => setTransakConfig(prev => ({ ...prev, partnerSecret: e.target.value }))}
                    className="font-mono text-sm"
                    data-testid="input-transak-secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transak-env">Environment</Label>
                  <select
                    id="transak-env"
                    value={transakConfig.environment}
                    onChange={(e) => setTransakConfig(prev => ({ ...prev, environment: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    data-testid="select-transak-environment"
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleTestConnection('Transak')}
                  variant="outline"
                  data-testid="button-test-transak"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => handleSaveConfig('Transak')}
                  data-testid="button-save-transak"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transak Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Settings</CardTitle>
              <CardDescription>
                Configure how the Transak widget appears to your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Default Currency</Label>
                    <select className="w-24 h-8 rounded border border-input bg-background px-2 text-sm">
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Default Crypto</Label>
                    <select className="w-24 h-8 rounded border border-input bg-background px-2 text-sm">
                      <option>USDC</option>
                      <option>USDT</option>
                      <option>ETH</option>
                      <option>BTC</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Min Amount</Label>
                    <Input type="number" defaultValue="10" className="w-24 h-8" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Max Amount</Label>
                    <Input type="number" defaultValue="5000" className="w-24 h-8" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cybrid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Cybrid API Configuration
              </CardTitle>
              <CardDescription>
                Configure your Cybrid customer token and trading accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cybrid-token">Customer Token</Label>
                  <Input
                    id="cybrid-token"
                    value={cybridConfig.customerToken}
                    onChange={(e) => setCybridConfig(prev => ({ ...prev, customerToken: e.target.value }))}
                    className="font-mono text-sm"
                    data-testid="input-cybrid-token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Generated from your Cybrid customer account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cybrid-deposit">USDC Deposit Address</Label>
                  <Input
                    id="cybrid-deposit"
                    value={cybridConfig.depositAddress}
                    readOnly
                    className="font-mono text-sm bg-muted"
                    data-testid="input-cybrid-deposit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated address for receiving USDC deposits
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <select
                      value={cybridConfig.environment}
                      onChange={(e) => setCybridConfig(prev => ({ ...prev, environment: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-cybrid-environment"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Plaid Connection</Label>
                    <div className="flex items-center gap-2 pt-2">
                      {cybridConfig.plaidConnected ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline">
                          Connect Plaid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleTestConnection('Cybrid')}
                  variant="outline"
                  data-testid="button-test-cybrid"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => handleSaveConfig('Cybrid')}
                  data-testid="button-save-cybrid"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trading Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Accounts</CardTitle>
              <CardDescription>
                Manage your crypto trading accounts and deposit addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">USDC Trading Account</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {cybridConfig.depositAddress}
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">USDT Trading Account</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      0x742d35Cc6Bf05322B38d82E73456789abcdef456
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}