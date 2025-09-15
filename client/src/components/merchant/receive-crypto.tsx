import { useState } from "react"
import { ArrowDownToLine, Copy, ExternalLink, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"

export function ReceiveCrypto() {
  const { toast } = useToast()
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [paymentLink, setPaymentLink] = useState("")
  const [quoteDetails, setQuoteDetails] = useState<any>(null)
  
  const form = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoCurrency: "USDC",
      fiatCurrency: "USD",
      paymentMethod: "credit_debit_card"
    }
  })

  // TODO: Check if merchant has completed KYB and created custodian account
  const merchantStatus = {
    kybCompleted: true, // This should come from real data
    custodianAccountCreated: true // This should come from real data
  }

  // Fetch real crypto currencies from Transak API
  const { data: cryptoCurrenciesData, isLoading: isLoadingCrypto, error: cryptoError } = useQuery({
    queryKey: ['/api/public/transak/crypto-currencies'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch real fiat currencies from Transak API
  const { data: fiatCurrenciesData, isLoading: isLoadingFiat, error: fiatError } = useQuery({
    queryKey: ['/api/public/transak/fiat-currencies'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch countries from Transak API
  const { data: countriesData, isLoading: isLoadingCountries, error: countriesError } = useQuery({
    queryKey: ['/api/public/transak/countries'],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })

  // Transform crypto currencies data for dropdown
  const supportedCrypto = (cryptoCurrenciesData as any)?.response?.map((crypto: { symbol: string, name: string }) => ({
    value: crypto.symbol,
    label: `${crypto.symbol} - ${crypto.name}`
  })) || [
    // Fallback options if API fails
    { value: "USDC", label: "USDC - USD Coin" },
    { value: "USDT", label: "USDT - Tether" },
    { value: "ETH", label: "ETH - Ethereum" },
    { value: "BTC", label: "BTC - Bitcoin" }
  ]

  // Transform fiat currencies data for dropdown
  const supportedFiat = (fiatCurrenciesData as any)?.response?.map((fiat: { symbol: string, name: string }) => ({
    value: fiat.symbol,
    label: `${fiat.symbol} - ${fiat.name}`
  })) || [
    // Fallback options if API fails
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" }
  ]

  const paymentMethods = [
    { value: "credit_debit_card", label: "Credit/Debit Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "sepa_bank_transfer", label: "SEPA Transfer (EUR)" },
    { value: "gbp_bank_transfer", label: "UK Bank Transfer (GBP)" }
  ]

  const handleCreateQuote = async (data: any) => {
    if (!merchantStatus.kybCompleted) {
      toast({
        title: "KYB Required",
        description: "Complete your KYB verification before creating payment links.",
        variant: "destructive"
      })
      return
    }

    if (!merchantStatus.custodianAccountCreated) {
      toast({
        title: "Custodian Account Required", 
        description: "Create your Cybrid custodian account before receiving crypto payments.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingQuote(true)
    console.log('Creating Transak quote with data:', data)

    try {
      // TODO: Implement real Transak API call to create quote
      // const response = await fetch('/api/transak/create-quote', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock quote response based on Transak API structure
      const mockQuote = {
        id: "quote_" + Date.now(),
        partnerOrderId: "order_" + Date.now(), 
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: data.cryptoCurrency,
        fiatAmount: (parseFloat(data.cryptoAmount) * (data.cryptoCurrency === 'USDC' ? 1 : data.cryptoCurrency === 'ETH' ? 2500 : 45000)).toFixed(2),
        fiatCurrency: data.fiatCurrency,
        paymentMethod: data.paymentMethod,
        fees: {
          transakFee: (parseFloat(data.cryptoAmount) * 0.025).toFixed(2),
          networkFee: data.cryptoCurrency === 'ETH' ? "15.00" : "2.50"
        },
        conversionRate: data.cryptoCurrency === 'USDC' ? 1 : data.cryptoCurrency === 'ETH' ? 2500 : 45000,
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        network: data.cryptoCurrency === 'BTC' ? 'bitcoin' : 'ethereum'
      }

      setQuoteDetails(mockQuote)
      
      // Generate payment link with Transak widget parameters
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://global.transak.com' 
        : 'https://global-stg.transak.com'
        
      const params = new URLSearchParams({
        apiKey: process.env.VITE_TRANSAK_API_KEY || 'transak_staging_key',
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: data.cryptoCurrency,
        fiatCurrency: data.fiatCurrency,
        paymentMethod: data.paymentMethod,
        network: mockQuote.network,
        partnerOrderId: mockQuote.partnerOrderId,
        email: '',
        disableWalletAddressForm: 'false'
      })
      
      const generatedLink = `${baseUrl}?${params.toString()}`
      setPaymentLink(generatedLink)
      
      toast({
        title: "Quote Created Successfully",
        description: "Payment link generated for your customer.",
      })
      
    } catch (error) {
      console.error('Error creating quote:', error)
      toast({
        title: "Quote Creation Failed",
        description: "Failed to create payment quote. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingQuote(false)
    }
  }

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLink)
    toast({
      title: "Copied to clipboard",
      description: "Payment link has been copied to your clipboard.",
    })
  }

  const resetForm = () => {
    setPaymentLink("")
    setQuoteDetails(null)
    form.reset()
  }

  // Block access if requirements not met
  if (!merchantStatus.kybCompleted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Receive Crypto</h1>
          <p className="text-muted-foreground">
            Generate payment links for customers to send you cryptocurrency
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              KYB Verification Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Complete your Know Your Business verification to start receiving crypto payments
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

  if (!merchantStatus.custodianAccountCreated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Receive Crypto</h1>
          <p className="text-muted-foreground">
            Generate payment links for customers to send you cryptocurrency
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Custodian Account Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Create your Cybrid custodian account to securely store received cryptocurrency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="button-create-custodian">
              <a href="/merchant/accounts">
                Create Custodian Account
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receive Crypto</h1>
        <p className="text-muted-foreground">
          Generate payment links using Transak onramp for customers to send you cryptocurrency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Create Payment Quote
            </CardTitle>
            <CardDescription>
              Set payment parameters and generate a customer payment link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateQuote)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                            data-testid="input-crypto-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cryptoCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cryptocurrency</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-crypto-currency">
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
                    control={form.control}
                    name="fiatCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiat Currency</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-fiat-currency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedFiat.map((fiat) => (
                                <SelectItem key={fiat.value} value={fiat.value}>
                                  {fiat.label}
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
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((method) => (
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

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isCreatingQuote}
                    className="flex-1"
                    data-testid="button-create-quote"
                  >
                    {isCreatingQuote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Quote & Payment Link
                  </Button>
                  {(paymentLink || quoteDetails) && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={resetForm}
                      data-testid="button-reset-form"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quote Details & Payment Link */}
        {quoteDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Quote Created
              </CardTitle>
              <CardDescription>
                Share this payment link with your customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quote Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crypto Amount:</span>
                    <span className="font-mono font-medium">
                      {quoteDetails.cryptoAmount} {quoteDetails.cryptoCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiat Amount:</span>
                    <span className="font-mono font-medium">
                      {quoteDetails.fiatAmount} {quoteDetails.fiatCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate:</span>
                    <span className="font-mono text-xs">
                      1 {quoteDetails.cryptoCurrency} = {quoteDetails.conversionRate} {quoteDetails.fiatCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network:</span>
                    <Badge variant="outline" className="text-xs">
                      {quoteDetails.network}
                    </Badge>
                  </div>
                </div>
                
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Transak Fee:</span>
                    <span className="font-mono">{quoteDetails.fees.transakFee} {quoteDetails.fiatCurrency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Network Fee:</span>
                    <span className="font-mono">{quoteDetails.fees.networkFee} {quoteDetails.fiatCurrency}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Quote expires: {new Date(quoteDetails.validUntil).toLocaleString()}
                </div>
              </div>

              {/* Payment Link */}
              <div className="space-y-2">
                <Label>Customer Payment Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={paymentLink}
                    readOnly
                    className="font-mono text-xs"
                    data-testid="input-payment-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPaymentLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(paymentLink, '_blank')}
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to your customer to initiate the crypto purchase via Transak widget
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Step-by-step process for receiving crypto payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                1
              </div>
              <h3 className="font-semibold">Create Quote</h3>
              <p className="text-sm text-muted-foreground">
                Set crypto amount, currency, and payment method preferences
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                2
              </div>
              <h3 className="font-semibold">Share Link</h3>
              <p className="text-sm text-muted-foreground">
                Send the payment link to your customer via email, SMS, or messaging
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                3
              </div>
              <h3 className="font-semibold">Receive Payment</h3>
              <p className="text-sm text-muted-foreground">
                Customer completes payment via Transak, crypto arrives in your custodian account
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}