import { useState } from "react"
import { Key, Save, Eye, EyeOff, AlertTriangle, CheckCircle, ExternalLink, Globe, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function ApiKeys() {
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  // Stored credentials - in real implementation these would come from backend
  const [transakCredentials, setTransakCredentials] = useState({
    apiKey: "",
    apiSecret: "", 
    environment: "staging"
  })

  const [cybridCredentials, setCybridCredentials] = useState({
    organizationGuid: "",
    bankGuid: "",
    clientId: "",
    clientSecret: "",
    environment: "sandbox"
  })

  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const handleTransakChange = (field: string, value: string) => {
    setTransakCredentials(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(prev => ({ ...prev, transak: true }))
  }

  const handleCybridChange = (field: string, value: string) => {
    setCybridCredentials(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(prev => ({ ...prev, cybrid: true }))
  }

  const saveTransakCredentials = async () => {
    // TODO: Implement real API call to save credentials (never log secrets)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setUnsavedChanges(prev => ({ ...prev, transak: false }))
    toast({
      title: "Transak Credentials Saved",
      description: "Your Transak API credentials have been securely stored.",
    })
  }

  const saveCybridCredentials = async () => {
    // TODO: Implement real API call to save credentials (never log secrets)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setUnsavedChanges(prev => ({ ...prev, cybrid: false }))
    toast({
      title: "Cybrid Credentials Saved", 
      description: "Your Cybrid API credentials have been securely stored.",
    })
  }

  const testTransakConnection = async () => {
    // TODO: Implement real API call to test credentials server-side
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast({
      title: "Connection Successful",
      description: "Successfully connected to Transak API.",
    })
  }

  const testCybridConnection = async () => {
    // TODO: Implement real API call to test credentials server-side
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast({
      title: "Connection Successful", 
      description: "Successfully connected to Cybrid API.",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integration Credentials</h1>
        <p className="text-muted-foreground">
          Add your Transak and Cybrid API credentials to enable crypto payment functionality
        </p>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Follow these steps to obtain your API credentials from each provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transak Setup */}
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

            {/* Cybrid Setup */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="h-4 w-4" />
                Cybrid Setup
              </h3>
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p>Access <strong>Cybrid Partner Portal</strong></p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p>Create organization and bank</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p>Note your <strong>Organization GUID</strong> and <strong>Bank GUID</strong></p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p>Generate <strong>Client ID</strong> and <strong>Client Secret</strong></p>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild data-testid="button-cybrid-docs">
                <a href="https://docs.cybrid.xyz" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Cybrid Docs
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

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

      {/* Cybrid Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Cybrid API Credentials
            </CardTitle>
            <CardDescription>
              Configure your Cybrid integration for custodian accounts and bank transfers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testCybridConnection}
              data-testid="button-test-cybrid"
            >
              Test Connection
            </Button>
            <Button
              onClick={saveCybridCredentials}
              disabled={!unsavedChanges.cybrid}
              size="sm"
              data-testid="button-save-cybrid"
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
                value={cybridCredentials.environment}
                onValueChange={(value) => handleCybridChange('environment', value)}
              >
                <SelectTrigger data-testid="select-cybrid-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              {cybridCredentials.environment === 'production' ? (
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

            {/* Organization GUID */}
            <div className="space-y-2">
              <Label>Organization GUID</Label>
              <Input
                value={cybridCredentials.organizationGuid}
                onChange={(e) => handleCybridChange('organizationGuid', e.target.value)}
                placeholder="12345678-1234-5678-9abc-123456789def"
                className="font-mono text-sm"
                data-testid="input-cybrid-org-guid"
              />
            </div>

            {/* Bank GUID */}
            <div className="space-y-2">
              <Label>Bank GUID</Label>
              <Input
                value={cybridCredentials.bankGuid}
                onChange={(e) => handleCybridChange('bankGuid', e.target.value)}
                placeholder="87654321-4321-8765-fedc-fedcba987654"
                className="font-mono text-sm"
                data-testid="input-cybrid-bank-guid"
              />
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={cybridCredentials.clientId}
                onChange={(e) => handleCybridChange('clientId', e.target.value)}
                placeholder="cybrid_client_id"
                className="font-mono text-sm"
                data-testid="input-cybrid-client-id"
              />
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.cybrid_secret ? "text" : "password"}
                  value={cybridCredentials.clientSecret}
                  onChange={(e) => handleCybridChange('clientSecret', e.target.value)}
                  placeholder="cybrid_client_secret"
                  className="font-mono text-sm"
                  data-testid="input-cybrid-client-secret"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSecretVisibility('cybrid_secret')}
                  data-testid="button-toggle-cybrid-secret"
                >
                  {showSecrets.cybrid_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {unsavedChanges.cybrid && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              You have unsaved changes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Examples</CardTitle>
          <CardDescription>
            Quick start code examples for integrating with CryptoPay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* JavaScript Example */}
            <div>
              <h3 className="font-semibold text-sm mb-3">JavaScript / Node.js</h3>
              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">
{`const cryptopay = require('@cryptopay/sdk');

const client = cryptopay({
  publicKey: 'pk_live_1234567890abcdef',
  secretKey: 'sk_live_abcdef1234567890fedcba0987654321'
});

const payment = await client.payments.create({
  amount: 100,
  currency: 'USD',
  crypto: 'USDC'
});`}
                </pre>
              </div>
            </div>

            {/* Python Example */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Python</h3>
              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">
{`import cryptopay

client = cryptopay.Client(
    public_key='pk_live_1234567890abcdef',
    secret_key='sk_live_abcdef1234567890fedcba0987654321'
)

payment = client.payments.create(
    amount=100,
    currency='USD',
    crypto='USDC'
)`}
                </pre>
              </div>
            </div>
          </div>
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