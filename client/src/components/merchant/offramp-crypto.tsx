import { useState } from "react"
import { ArrowUpFromLine, ExternalLink, Loader2, CheckCircle, AlertTriangle, Banknote, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"

export function OfframpCrypto() {
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState<'transak' | 'cybrid'>('transak')
  const [isCreatingPayout, setIsCreatingPayout] = useState(false)
  const [payoutDetails, setPayoutDetails] = useState<any>(null)
  const [paymentLink, setPaymentLink] = useState("")

  const transakForm = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoCurrency: "USDC",
      fiatCurrency: "USD",
      payoutMethod: "bank_transfer"
    }
  })

  const cybridForm = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoCurrency: "USDC", 
      payoutMethod: "ach",
      bankAccount: ""
    }
  })

  // TODO: Check merchant status and available bank accounts
  const merchantStatus = {
    kybCompleted: true,
    custodianAccountCreated: true,
    bankAccountsConnected: true,
    availableBalance: {
      USDC: "2500.00",
      USDT: "1800.50", 
      ETH: "0.75",
      BTC: "0.05"
    }
  }

  // Mock bank accounts - should come from Cybrid API
  const bankAccounts = [
    { id: "bank_001", name: "Chase Business Checking", accountType: "checking", last4: "1234" },
    { id: "bank_002", name: "Wells Fargo Savings", accountType: "savings", last4: "5678" }
  ]

  const supportedCrypto = [
    { value: "USDC", label: "USDC - USD Coin" },
    { value: "USDT", label: "USDT - Tether" },
    { value: "ETH", label: "ETH - Ethereum" },
    { value: "BTC", label: "BTC - Bitcoin" }
  ]

  const transakPayoutMethods = [
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "debit_card", label: "Debit Card" },
    { value: "sepa_transfer", label: "SEPA Transfer (EUR)" },
    { value: "gbp_transfer", label: "UK Bank Transfer (GBP)" }
  ]

  const cybridPayoutMethods = [
    { value: "ach", label: "ACH Transfer" },
    { value: "wire", label: "Wire Transfer" }
  ]

  const handleTransakPayout = async (data: any) => {
    setIsCreatingPayout(true)
    console.log('Creating Transak offramp quote:', data)

    try {
      // TODO: Implement real Transak offramp API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockQuote = {
        id: "offramp_" + Date.now(),
        type: "transak",
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: data.cryptoCurrency,
        fiatAmount: (parseFloat(data.cryptoAmount) * (data.cryptoCurrency === 'USDC' ? 0.998 : 2495)).toFixed(2),
        fiatCurrency: data.fiatCurrency,
        payoutMethod: data.payoutMethod,
        fees: {
          transakFee: (parseFloat(data.cryptoAmount) * 0.01).toFixed(2), // 1% fee
          networkFee: data.cryptoCurrency === 'ETH' ? "12.00" : "2.00"
        },
        processingTime: data.payoutMethod === 'debit_card' ? '5-30 minutes' : 
                         data.payoutMethod === 'wire' ? '1-2 hours' : '1-3 business days'
      }

      setPayoutDetails(mockQuote)
      
      // Generate Transak offramp widget link
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://global.transak.com' 
        : 'https://global-stg.transak.com'
        
      const params = new URLSearchParams({
        apiKey: process.env.VITE_TRANSAK_API_KEY || 'transak_staging_key',
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: data.cryptoCurrency,
        fiatCurrency: data.fiatCurrency,
        payoutMethod: data.payoutMethod,
        isBuyOrSell: 'SELL',
        partnerOrderId: mockQuote.id
      })
      
      setPaymentLink(`${baseUrl}?${params.toString()}`)
      
      toast({
        title: "Transak Payout Quote Created",
        description: "Click the link to complete your crypto offramp via Transak.",
      })
      
    } catch (error) {
      toast({
        title: "Payout Creation Failed",
        description: "Failed to create payout quote. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingPayout(false)
    }
  }

  const handleCybridPayout = async (data: any) => {
    setIsCreatingPayout(true)
    console.log('Creating Cybrid payout:', data)

    try {
      // TODO: Implement real Cybrid payout API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockPayout = {
        id: "cybrid_payout_" + Date.now(),
        type: "cybrid",
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: data.cryptoCurrency,
        fiatAmount: (parseFloat(data.cryptoAmount) * (data.cryptoCurrency === 'USDC' ? 0.999 : 2498)).toFixed(2),
        fiatCurrency: "USD",
        payoutMethod: data.payoutMethod,
        bankAccount: bankAccounts.find(acc => acc.id === data.bankAccount)?.name || "Selected Bank",
        fees: {
          cybridFee: data.payoutMethod === 'wire' ? "25.00" : "3.00",
          networkFee: "0.50"
        },
        processingTime: data.payoutMethod === 'wire' ? 'Same day' : '1-2 business days',
        status: 'processing'
      }

      setPayoutDetails(mockPayout)
      
      toast({
        title: "Cybrid Payout Initiated",
        description: `${data.payoutMethod.toUpperCase()} payout has been initiated and is processing.`,
      })
      
    } catch (error) {
      toast({
        title: "Payout Failed",
        description: "Failed to initiate payout. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingPayout(false)
    }
  }

  const resetForms = () => {
    setPayoutDetails(null)
    setPaymentLink("")
    transakForm.reset()
    cybridForm.reset()
  }

  if (!merchantStatus.kybCompleted || !merchantStatus.custodianAccountCreated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Offramp Crypto</h1>
          <p className="text-muted-foreground">
            Convert your cryptocurrency to fiat currency
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Account Setup Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Complete your KYB verification and create a custodian account to access offramp functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!merchantStatus.kybCompleted && (
              <Button asChild variant="outline">
                <a href="/merchant/onboarding">Complete KYB Verification</a>
              </Button>
            )}
            {!merchantStatus.custodianAccountCreated && (
              <Button asChild variant="outline">
                <a href="/merchant/accounts">Create Custodian Account</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Offramp Crypto</h1>
        <p className="text-muted-foreground">
          Convert cryptocurrency to fiat using Transak or Cybrid payout options
        </p>
      </div>

      {/* Available Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Available Crypto Balances</CardTitle>
          <CardDescription>
            Your current cryptocurrency holdings in the custodian account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(merchantStatus.availableBalance).map(([crypto, balance]) => (
              <div key={crypto} className="text-center p-3 border rounded-lg">
                <div className="font-mono text-lg font-bold">{balance}</div>
                <div className="text-sm text-muted-foreground">{crypto}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeProvider} onValueChange={(value) => setActiveProvider(value as 'transak' | 'cybrid')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transak" className="flex items-center gap-2" data-testid="tab-transak-offramp">
            <ExternalLink className="h-4 w-4" />
            Transak Offramp
          </TabsTrigger>
          <TabsTrigger value="cybrid" className="flex items-center gap-2" data-testid="tab-cybrid-payout">
            <Building className="h-4 w-4" />
            Cybrid Payout
          </TabsTrigger>
        </TabsList>

        {/* Transak Offramp */}
        <TabsContent value="transak" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5" />
                  Transak Offramp
                </CardTitle>
                <CardDescription>
                  Sell crypto directly to fiat via Transak's offramp service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...transakForm}>
                  <form onSubmit={transakForm.handleSubmit(handleTransakPayout)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={transakForm.control}
                        name="cryptoAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crypto Amount</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="100"
                                type="number"
                                step="0.000001"
                                {...field}
                                data-testid="input-transak-crypto-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transakForm.control}
                        name="cryptoCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cryptocurrency</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-transak-crypto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {supportedCrypto.map((crypto) => (
                                    <SelectItem key={crypto.value} value={crypto.value}>
                                      {crypto.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transakForm.control}
                        name="fiatCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fiat Currency</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-transak-fiat">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transakForm.control}
                        name="payoutMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payout Method</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-transak-payout-method">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {transakPayoutMethods.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isCreatingPayout}
                      className="w-full"
                      data-testid="button-create-transak-payout"
                    >
                      {isCreatingPayout && activeProvider === 'transak' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Transak Offramp
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {payoutDetails && payoutDetails.type === 'transak' && paymentLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Transak Offramp Link Ready
                  </CardTitle>
                  <CardDescription>
                    Click the link to complete your crypto sale via Transak
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selling:</span>
                        <span className="font-mono">{payoutDetails.cryptoAmount} {payoutDetails.cryptoCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receiving:</span>
                        <span className="font-mono font-medium text-green-600">{payoutDetails.fiatAmount} {payoutDetails.fiatCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transak Fee:</span>
                        <span className="font-mono text-red-600">{payoutDetails.fees.transakFee} {payoutDetails.fiatCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing:</span>
                        <span className="text-xs">{payoutDetails.processingTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={() => window.open(paymentLink, '_blank')} 
                      className="w-full"
                      data-testid="button-open-transak-link"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Offramp via Transak
                    </Button>
                    <Button variant="outline" onClick={resetForms} className="w-full">
                      Create Another Offramp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Cybrid Payout */}
        <TabsContent value="cybrid" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Cybrid Payout
                </CardTitle>
                <CardDescription>
                  Direct ACH or Wire transfer to your connected bank account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...cybridForm}>
                  <form onSubmit={cybridForm.handleSubmit(handleCybridPayout)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={cybridForm.control}
                        name="cryptoAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crypto Amount</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="100"
                                type="number"
                                step="0.000001"
                                {...field}
                                data-testid="input-cybrid-crypto-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cybridForm.control}
                        name="cryptoCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cryptocurrency</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-cybrid-crypto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {supportedCrypto.map((crypto) => (
                                    <SelectItem key={crypto.value} value={crypto.value}>
                                      {crypto.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cybridForm.control}
                        name="payoutMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payout Method</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-cybrid-payout-method">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {cybridPayoutMethods.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cybridForm.control}
                        name="bankAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Account</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-bank-account">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bankAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} ••••{account.last4}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isCreatingPayout}
                      className="w-full"
                      data-testid="button-create-cybrid-payout"
                    >
                      {isCreatingPayout && activeProvider === 'cybrid' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Initiate Cybrid Payout
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {payoutDetails && payoutDetails.type === 'cybrid' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Payout Initiated
                  </CardTitle>
                  <CardDescription>
                    Your Cybrid payout is being processed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payout ID:</span>
                        <code className="text-xs bg-background px-1 py-0.5 rounded">{payoutDetails.id}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-mono font-medium text-green-600">${payoutDetails.fiatAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <Badge>{payoutDetails.payoutMethod.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To Account:</span>
                        <span className="text-xs">{payoutDetails.bankAccount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Time:</span>
                        <span className="text-xs">{payoutDetails.processingTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="secondary">{payoutDetails.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" onClick={resetForms} className="w-full">
                    Create Another Payout
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Transak Offramp
            </CardTitle>
            <CardDescription>Direct crypto-to-fiat conversion</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Fee:</span>
              <span>1% of transaction</span>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <span>1-3 business days</span>
            </div>
            <div className="flex justify-between">
              <span>Supported:</span>
              <span>40+ cryptocurrencies</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Cybrid Payout
            </CardTitle>
            <CardDescription>Direct bank transfer from your crypto</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>ACH Fee:</span>
              <span>$3.00 flat fee</span>
            </div>
            <div className="flex justify-between">
              <span>Wire Fee:</span>
              <span>$25.00 flat fee</span>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <span>Same day to 2 days</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}