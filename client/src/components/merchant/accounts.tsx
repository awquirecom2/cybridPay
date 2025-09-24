import { useState } from "react"
import { Wallet, Plus, CheckCircle, AlertTriangle, ExternalLink, Copy, Settings, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"

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

export function Accounts() {
  const { toast } = useToast()
  const [isCreatingCustodian, setIsCreatingCustodian] = useState(false)
  const [isConnectingBank, setIsConnectingBank] = useState(false)

  // Fetch deposit addresses from API
  const { 
    data: depositAddressesData, 
    isLoading: isLoadingAddresses, 
    error: addressesError 
  } = useQuery<DepositAddressesResponse>({
    queryKey: ['/api/merchant/deposit-addresses'],
    enabled: true, // Only fetch if merchant has custodian account
  })

  // TODO: Replace with real merchant account data
  const merchantStatus = {
    kybCompleted: true,
    custodianAccountStatus: 'created', // 'none', 'pending', 'created'
    bankAccountsConnected: 1
  }

  const custodianAccount = {
    id: "cybrid_account_12345",
    status: "active",
    createdAt: "2024-01-15",
  }

  const connectedBankAccounts = [
    {
      id: "bank_001",
      bankName: "Chase Bank",
      accountType: "Business Checking",
      last4: "1234",
      status: "verified",
      addedAt: "2024-01-20",
      supportedPayouts: ["ACH", "Wire"]
    }
  ]

  const handleCreateCustodianAccount = async () => {
    if (!merchantStatus.kybCompleted) {
      toast({
        title: "KYB Required",
        description: "Complete your KYB verification before creating a custodian account.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingCustodian(true)
    console.log('Creating Cybrid custodian account')

    try {
      // TODO: Implement real Cybrid custodian account creation
      // const response = await fetch('/api/cybrid/create-customer', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ merchantId: 'current_merchant_id' })
      // })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      toast({
        title: "Custodian Account Created",
        description: "Your Cybrid custodian account has been successfully created with wallet addresses generated.",
      })
      
    } catch (error) {
      toast({
        title: "Account Creation Failed",
        description: "Failed to create custodian account. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingCustodian(false)
    }
  }

  const handleConnectBankAccount = async () => {
    setIsConnectingBank(true)
    console.log('Initiating Plaid Link for bank account connection')

    try {
      // TODO: Implement real Plaid Link integration with Cybrid
      // const response = await fetch('/api/cybrid/create-workflow', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type: 'plaid_link_token' })
      // })

      // Simulate Plaid Link process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Bank Account Connected",
        description: "Bank account has been verified and connected for payouts.",
      })
      
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect bank account. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsConnectingBank(false)
    }
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
      verified: { variant: "default" as const, icon: CheckCircle, text: "Verified" }
    }
    const config = variants[status as keyof typeof variants] || variants.active
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  // KYB not completed
  if (!merchantStatus.kybCompleted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Management</h1>
          <p className="text-muted-foreground">
            Manage your Cybrid custodian account and connected bank accounts
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              KYB Verification Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Complete your Know Your Business verification before creating accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="button-complete-kyb">
              <a href="/merchant/onboarding">
                Complete KYB Verification
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No custodian account created yet
  if (merchantStatus.custodianAccountStatus === 'none') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Management</h1>
          <p className="text-muted-foreground">
            Create your Cybrid custodian account to securely store and manage cryptocurrency
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Create Cybrid Custodian Account
            </CardTitle>
            <CardDescription>
              Set up your secure cryptocurrency custody solution with MPC wallet infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">What you'll get:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Multi-Party Computation (MPC) wallet security</li>
                <li>• Individual deposit addresses for USDC, USDT, ETH, and BTC</li>
                <li>• Qualified custodian asset protection</li>
                <li>• Integrated compliance and monitoring</li>
                <li>• Required for receiving crypto payments</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleCreateCustodianAccount}
              disabled={isCreatingCustodian}
              className="w-full"
              data-testid="button-create-custodian-account"
            >
              {isCreatingCustodian ? "Creating Account..." : "Create Custodian Account"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
            <CardDescription>Requirements that have been met</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>KYB verification completed</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Account created - show full management interface
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Management</h1>
        <p className="text-muted-foreground">
          Manage your Cybrid custodian account and connected bank accounts for payouts
        </p>
      </div>

      {/* Custodian Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cybrid Custodian Account
          </CardTitle>
          <CardDescription>
            Your secure cryptocurrency custody account with MPC wallet infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Account ID</div>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{custodianAccount.id}</code>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Status</div>
              {getStatusBadge(custodianAccount.status)}
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="text-sm">{new Date(custodianAccount.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cryptocurrency Wallets */}
      <Card>
        <CardHeader>
          <CardTitle>Cryptocurrency Wallets</CardTitle>
          <CardDescription>
            Your individual deposit addresses for different cryptocurrencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAddresses ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading deposit addresses...</span>
            </div>
          ) : addressesError ? (
            <div className="text-center p-6">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="font-semibold mb-2">Unable to Load Addresses</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Failed to fetch your deposit addresses. Please try refreshing the page.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          ) : depositAddressesData?.success && depositAddressesData?.addresses?.length > 0 ? (
            <div className="space-y-4">
              {depositAddressesData.addresses.map((address: DepositAddress) => (
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

      <Separator />

      {/* Bank Accounts for Payouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Bank Accounts</CardTitle>
            <CardDescription>
              Bank accounts for ACH and Wire payouts via Cybrid
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
          {connectedBankAccounts.length > 0 ? (
            <div className="space-y-3">
              {connectedBankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{account.bankName}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.accountType} ••••{account.last4}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Connected {new Date(account.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(account.status)}
                    <div className="flex gap-1">
                      {account.supportedPayouts.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-muted-foreground">
              <p>No bank accounts connected yet</p>
              <p className="text-sm">Connect a bank account to enable ACH and Wire payouts</p>
            </div>
          )}
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
              View Account Details in Cybrid Dashboard
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Security & Compliance Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}