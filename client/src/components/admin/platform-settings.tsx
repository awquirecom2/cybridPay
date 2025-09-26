import { useState } from "react"
import { Save, Settings, Globe, Clock, Shield, AlertTriangle, Database, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function PlatformSettings() {
  const { toast } = useToast()
  
  // Platform configuration state
  const [platformConfig, setPlatformConfig] = useState({
    name: "Ruupay",
    supportEmail: "support@ruupay.com",
    contactPhone: "+1-555-0123",
    defaultCurrency: "USD",
    maintenanceMode: false,
    allowNewMerchants: true,
    autoApproveKYB: false
  })

  // Transaction limits state
  const [transactionLimits, setTransactionLimits] = useState({
    minTransactionAmount: "10",
    maxTransactionAmount: "50000", 
    dailyLimitPerMerchant: "100000",
    monthlyLimitPerMerchant: "1000000",
    sessionTimeoutMinutes: "30"
  })

  // Supported regions and currencies
  const [supportedRegions, setSupportedRegions] = useState([
    { code: "US", name: "United States", enabled: true },
    { code: "EU", name: "European Union", enabled: true },
    { code: "UK", name: "United Kingdom", enabled: true },
    { code: "CA", name: "Canada", enabled: false },
    { code: "AU", name: "Australia", enabled: false }
  ])

  const [supportedCurrencies, setSupportedCurrencies] = useState([
    { code: "USD", name: "US Dollar", enabled: true },
    { code: "EUR", name: "Euro", enabled: true },
    { code: "GBP", name: "British Pound", enabled: true },
    { code: "CAD", name: "Canadian Dollar", enabled: false },
    { code: "AUD", name: "Australian Dollar", enabled: false }
  ])

  // Integration settings state
  const [integrationSettings, setIntegrationSettings] = useState({
    cybridEnvironment: "sandbox",
    cybridClientId: "",
    transakEnvironment: "staging",
    transakApiKey: "",
    googleCloudProjectId: "",
    webhookRetryAttempts: "3",
    webhookTimeoutSeconds: "30"
  })

  const handleSavePlatformConfig = () => {
    // TODO: Implement API call to save platform configuration
    toast({
      title: "Platform Settings Saved",
      description: "Platform configuration has been updated successfully."
    })
  }

  const handleSaveTransactionLimits = () => {
    // TODO: Implement API call to save transaction limits
    toast({
      title: "Transaction Limits Updated", 
      description: "Transaction limits have been updated successfully."
    })
  }

  const handleSaveIntegrationSettings = () => {
    // TODO: Implement API call to save integration settings to Google Cloud Secrets
    toast({
      title: "Integration Settings Saved",
      description: "Integration settings have been saved to Google Cloud Secrets."
    })
  }

  const toggleRegionStatus = (regionCode: string) => {
    setSupportedRegions(prev => 
      prev.map(region => 
        region.code === regionCode 
          ? { ...region, enabled: !region.enabled }
          : region
      )
    )
  }

  const toggleCurrencyStatus = (currencyCode: string) => {
    setSupportedCurrencies(prev =>
      prev.map(currency =>
        currency.code === currencyCode
          ? { ...currency, enabled: !currency.enabled }
          : currency
      )
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings, limits, and integrations
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="limits" data-testid="tab-limits">
            <Shield className="h-4 w-4 mr-2" />
            Limits
          </TabsTrigger>
          <TabsTrigger value="regions" data-testid="tab-regions">
            <Globe className="h-4 w-4 mr-2" />
            Regions
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Key className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Configuration
              </CardTitle>
              <CardDescription>
                Basic platform settings and branding configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={platformConfig.name}
                    onChange={(e) => setPlatformConfig(prev => ({...prev, name: e.target.value}))}
                    data-testid="input-platform-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={platformConfig.supportEmail}
                    onChange={(e) => setPlatformConfig(prev => ({...prev, supportEmail: e.target.value}))}
                    data-testid="input-support-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    value={platformConfig.contactPhone}
                    onChange={(e) => setPlatformConfig(prev => ({...prev, contactPhone: e.target.value}))}
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Select value={platformConfig.defaultCurrency} onValueChange={(value) => setPlatformConfig(prev => ({...prev, defaultCurrency: value}))}>
                    <SelectTrigger data-testid="select-default-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Platform Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable platform for maintenance
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {platformConfig.maintenanceMode && (
                        <Badge variant="destructive">Active</Badge>
                      )}
                      <Switch
                        checked={platformConfig.maintenanceMode}
                        onCheckedChange={(checked) => setPlatformConfig(prev => ({...prev, maintenanceMode: checked}))}
                        data-testid="switch-maintenance-mode"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow New Merchant Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable new merchants to register on the platform
                      </p>
                    </div>
                    <Switch
                      checked={platformConfig.allowNewMerchants}
                      onCheckedChange={(checked) => setPlatformConfig(prev => ({...prev, allowNewMerchants: checked}))}
                      data-testid="switch-allow-new-merchants"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-approve KYB</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically approve merchants after KYB submission
                      </p>
                    </div>
                    <Switch
                      checked={platformConfig.autoApproveKYB}
                      onCheckedChange={(checked) => setPlatformConfig(prev => ({...prev, autoApproveKYB: checked}))}
                      data-testid="switch-auto-approve-kyb"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button onClick={handleSavePlatformConfig} data-testid="button-save-platform-config">
                  <Save className="h-4 w-4 mr-2" />
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Limits Tab */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Transaction Limits & Security
              </CardTitle>
              <CardDescription>
                Configure transaction limits and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min-transaction">Minimum Transaction Amount (USD)</Label>
                  <Input
                    id="min-transaction"
                    type="number"
                    value={transactionLimits.minTransactionAmount}
                    onChange={(e) => setTransactionLimits(prev => ({...prev, minTransactionAmount: e.target.value}))}
                    data-testid="input-min-transaction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-transaction">Maximum Transaction Amount (USD)</Label>
                  <Input
                    id="max-transaction"
                    type="number"
                    value={transactionLimits.maxTransactionAmount}
                    onChange={(e) => setTransactionLimits(prev => ({...prev, maxTransactionAmount: e.target.value}))}
                    data-testid="input-max-transaction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Daily Limit Per Merchant (USD)</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={transactionLimits.dailyLimitPerMerchant}
                    onChange={(e) => setTransactionLimits(prev => ({...prev, dailyLimitPerMerchant: e.target.value}))}
                    data-testid="input-daily-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Monthly Limit Per Merchant (USD)</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    value={transactionLimits.monthlyLimitPerMerchant}
                    onChange={(e) => setTransactionLimits(prev => ({...prev, monthlyLimitPerMerchant: e.target.value}))}
                    data-testid="input-monthly-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (Minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={transactionLimits.sessionTimeoutMinutes}
                    onChange={(e) => setTransactionLimits(prev => ({...prev, sessionTimeoutMinutes: e.target.value}))}
                    data-testid="input-session-timeout"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button onClick={handleSaveTransactionLimits} data-testid="button-save-transaction-limits">
                  <Save className="h-4 w-4 mr-2" />
                  Save Transaction Limits
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions & Currencies Tab */}
        <TabsContent value="regions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Supported Regions
                </CardTitle>
                <CardDescription>
                  Enable or disable supported regions for merchant operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportedRegions.map((region) => (
                    <div key={region.code} className="flex items-center justify-between">
                      <div>
                        <Label>{region.name}</Label>
                        <p className="text-sm text-muted-foreground">{region.code}</p>
                      </div>
                      <Switch
                        checked={region.enabled}
                        onCheckedChange={() => toggleRegionStatus(region.code)}
                        data-testid={`switch-region-${region.code}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Supported Currencies
                </CardTitle>
                <CardDescription>
                  Enable or disable fiat currencies for platform operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportedCurrencies.map((currency) => (
                    <div key={currency.code} className="flex items-center justify-between">
                      <div>
                        <Label>{currency.name}</Label>
                        <p className="text-sm text-muted-foreground">{currency.code}</p>
                      </div>
                      <Switch
                        checked={currency.enabled}
                        onCheckedChange={() => toggleCurrencyStatus(currency.code)}
                        data-testid={`switch-currency-${currency.code}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integration Settings Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Integration Configuration
                </CardTitle>
                <CardDescription>
                  Configure third-party integrations and API credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cybrid Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Cybrid Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cybrid-environment">Environment</Label>
                      <Select value={integrationSettings.cybridEnvironment} onValueChange={(value) => setIntegrationSettings(prev => ({...prev, cybridEnvironment: value}))}>
                        <SelectTrigger data-testid="select-cybrid-environment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cybrid-client-id">Client ID</Label>
                      <Input
                        id="cybrid-client-id"
                        type="password"
                        placeholder="Will be stored in Google Cloud Secrets"
                        value={integrationSettings.cybridClientId}
                        onChange={(e) => setIntegrationSettings(prev => ({...prev, cybridClientId: e.target.value}))}
                        data-testid="input-cybrid-client-id"
                      />
                      <p className="text-xs text-muted-foreground">
                        Credentials are encrypted and stored in Google Cloud Secret Manager
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transak Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Transak Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transak-environment">Environment</Label>
                      <Select value={integrationSettings.transakEnvironment} onValueChange={(value) => setIntegrationSettings(prev => ({...prev, transakEnvironment: value}))}>
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
                      <Label htmlFor="transak-api-key">API Key</Label>
                      <Input
                        id="transak-api-key"
                        type="password"
                        placeholder="Will be stored in Google Cloud Secrets"
                        value={integrationSettings.transakApiKey}
                        onChange={(e) => setIntegrationSettings(prev => ({...prev, transakApiKey: e.target.value}))}
                        data-testid="input-transak-api-key"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Cloud Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Google Cloud Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gcp-project-id">Project ID</Label>
                      <Input
                        id="gcp-project-id"
                        value={integrationSettings.googleCloudProjectId}
                        onChange={(e) => setIntegrationSettings(prev => ({...prev, googleCloudProjectId: e.target.value}))}
                        data-testid="input-gcp-project-id"
                      />
                    </div>
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Webhook Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-retry-attempts">Retry Attempts</Label>
                      <Input
                        id="webhook-retry-attempts"
                        type="number"
                        value={integrationSettings.webhookRetryAttempts}
                        onChange={(e) => setIntegrationSettings(prev => ({...prev, webhookRetryAttempts: e.target.value}))}
                        data-testid="input-webhook-retry-attempts"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhook-timeout">Timeout (Seconds)</Label>
                      <Input
                        id="webhook-timeout"
                        type="number"
                        value={integrationSettings.webhookTimeoutSeconds}
                        onChange={(e) => setIntegrationSettings(prev => ({...prev, webhookTimeoutSeconds: e.target.value}))}
                        data-testid="input-webhook-timeout"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button onClick={handleSaveIntegrationSettings} data-testid="button-save-integration-settings">
                    <Save className="h-4 w-4 mr-2" />
                    Save Integration Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}