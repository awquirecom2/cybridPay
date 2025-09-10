import { useState } from "react"
import { Key, Copy, RotateCcw, Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

export function ApiKeys() {
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  // TODO: remove mock functionality - replace with real API key management
  const mockApiKeys = [
    {
      id: "key_001",
      name: "Production API Key",
      key: "pk_live_1234567890abcdef",
      secret: "sk_live_abcdef1234567890fedcba0987654321",
      environment: "live",
      created: "2024-01-15",
      lastUsed: "2024-01-21",
      permissions: ["payments", "webhooks", "accounts"]
    },
    {
      id: "key_002", 
      name: "Staging API Key",
      key: "pk_test_1234567890abcdef",
      secret: "sk_test_abcdef1234567890fedcba0987654321",
      environment: "test",
      created: "2024-01-10",
      lastUsed: "2024-01-20",
      permissions: ["payments", "webhooks"]
    }
  ]

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to your clipboard.`,
    })
  }

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const maskSecret = (secret: string) => {
    return secret.substring(0, 8) + '•'.repeat(24) + secret.substring(secret.length - 4)
  }

  const handleRegenerateKey = (keyId: string) => {
    console.log(`Regenerating API key: ${keyId}`)
    toast({
      title: "API Key Regenerated",
      description: "Your API key has been regenerated. Please update your applications.",
    })
  }

  const handleDeleteKey = (keyId: string) => {
    console.log(`Deleting API key: ${keyId}`)
    toast({
      title: "API Key Deleted",
      description: "The API key has been permanently deleted.",
    })
  }

  const handleCreateKey = () => {
    console.log('Creating new API key')
    toast({
      title: "API Key Created",
      description: "New API key has been generated successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Key Management</h1>
          <p className="text-muted-foreground">
            Manage your API keys for secure integration with CryptoPay services
          </p>
        </div>
        <Button onClick={handleCreateKey} data-testid="button-create-api-key">
          <Plus className="h-4 w-4 mr-2" />
          Create New Key
        </Button>
      </div>

      {/* API Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security Guidelines
          </CardTitle>
          <CardDescription>
            Important security practices for API key management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Best Practices</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Store API keys securely in environment variables</li>
                <li>• Never commit API keys to version control</li>
                <li>• Use different keys for staging and production</li>
                <li>• Regenerate keys regularly for security</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Integration Help</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Include public key in client-side code</li>
                <li>• Keep secret key on server-side only</li>
                <li>• Use HTTPS for all API communications</li>
                <li>• Monitor API key usage regularly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-4">
        {mockApiKeys.map((apiKey) => (
          <Card key={apiKey.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.environment === 'live' ? 'default' : 'secondary'}>
                      {apiKey.environment === 'live' ? 'Production' : 'Test'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {new Date(apiKey.created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" data-testid={`button-regenerate-${apiKey.id}`}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will generate a new API key and invalidate the current one. 
                          Any applications using the current key will stop working until updated.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRegenerateKey(apiKey.id)}>
                          Regenerate Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" data-testid={`button-delete-${apiKey.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the API key. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteKey(apiKey.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Public Key */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Public Key</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    defaultValue={apiKey.key} 
                    readOnly 
                    className="font-mono text-sm"
                    data-testid={`input-public-key-${apiKey.id}`}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(apiKey.key, 'Public key')}
                    data-testid={`button-copy-public-${apiKey.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Safe to use in client-side code and public repositories
                </p>
              </div>

              {/* Secret Key */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Secret Key</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    defaultValue={showSecrets[apiKey.id] ? apiKey.secret : maskSecret(apiKey.secret)}
                    readOnly 
                    className="font-mono text-sm"
                    type={showSecrets[apiKey.id] ? "text" : "password"}
                    data-testid={`input-secret-key-${apiKey.id}`}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => toggleSecretVisibility(apiKey.id)}
                    data-testid={`button-toggle-secret-${apiKey.id}`}
                  >
                    {showSecrets[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(apiKey.secret, 'Secret key')}
                    data-testid={`button-copy-secret-${apiKey.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Keep this secret! Only use in server-side code and secure environments
                </p>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Used</p>
                  <p className="text-sm">{new Date(apiKey.lastUsed).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {apiKey.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="default" className="mt-1">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Examples</CardTitle>
          <CardDescription>
            Quick start code examples for different programming languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm overflow-x-auto">
                <code>{`const cryptopay = require('@cryptopay/sdk');
const client = cryptopay({
  publicKey: 'pk_live_1234567890abcdef',
  secretKey: 'sk_live_abcdef1234567890fedcba0987654321'
});

const payment = await client.payments.create({
  amount: 100,
  currency: 'USD',
  crypto: 'USDC'
});`}</code>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Python</h3>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm overflow-x-auto">
                <code>{`import cryptopay

client = cryptopay.Client(
    public_key='pk_live_1234567890abcdef',
    secret_key='sk_live_abcdef1234567890fedcba0987654321'
)

payment = client.payments.create(
    amount=100,
    currency='USD',
    crypto='USDC'
)`}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}