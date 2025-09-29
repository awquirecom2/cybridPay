import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpFromLine, ExternalLink, Loader2, CheckCircle, AlertTriangle, Banknote, Building, Copy, Wallet, DollarSign, Clock, CreditCard, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { useMerchantProfile } from "@/hooks/use-merchant-profile"

// Crypto Icon Component with real images
const CryptoIcon = ({ imageUrl, crypto, className = "w-6 h-6" }: { imageUrl?: string, crypto: string, className?: string }) => {
  const cryptoColors: { [key: string]: string } = {
    'BTC': '#f7931a',
    'ETH': '#627eea', 
    'USDC': '#2775ca',
    'USDT': '#26a17b',
    'DAI': '#ffb700',
    'MATIC': '#8247e5',
    'BNB': '#f3ba2f',
    'AVAX': '#e84142',
    'SOL': '#9945ff',
    'WBTC': '#f09242'
  };

  const color = cryptoColors[crypto] || '#6b7280';

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={crypto}
        className={`${className} rounded-full object-cover`}
        onError={(e) => {
          const target = e.target as HTMLElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center text-white text-sm font-bold`}
      style={{ backgroundColor: color }}
    >
      {crypto.slice(0, crypto.length > 4 ? 2 : crypto.length)}
    </div>
  );
};

export function UnifiedCryptoPayout() {
  const { toast } = useToast()
  const { data: merchantProfile, isLoading: isLoadingProfile, isKycComplete } = useMerchantProfile()
  const [isCreatingPayout, setIsCreatingPayout] = useState(false)
  const [payoutDetails, setPayoutDetails] = useState<any>(null)
  const [paymentLink, setPaymentLink] = useState("")
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [quoteDetails, setQuoteDetails] = useState<any>(null)

  // Simple crypto options for fallback
  const supportedCrypto = [
    { value: "USDC", label: "USDC - USD Coin" },
    { value: "USDT", label: "USDT - Tether" },
    { value: "ETH", label: "ETH - Ethereum" },
    { value: "BTC", label: "BTC - Bitcoin" }
  ]

  // Mock bank accounts - should come from Cybrid API
  const bankAccounts = [
    { id: "bank_001", name: "Chase Business Checking", accountType: "checking", last4: "1234" },
    { id: "bank_002", name: "Wells Fargo Savings", accountType: "savings", last4: "5678" }
  ]

  // Mock crypto balances - TODO: Replace with real Cybrid account balances
  const mockAvailableBalance = {
    USDC: "2500.00",
    USDT: "1800.50", 
    ETH: "0.75",
    BTC: "0.05"
  }

  // Fetch real crypto currencies from API
  const { data: cryptoCurrenciesData, isLoading: isLoadingCrypto, error: cryptoError } = useQuery({
    queryKey: ['/api/public/transak/crypto-currencies'],
    staleTime: 5 * 60 * 1000,
    enabled: isKycComplete,
  })

  // Fetch fiat currencies with payment methods
  const { data: fiatCurrenciesData, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['/api/public/transak/fiat-currencies'],
    staleTime: 5 * 60 * 1000,
    enabled: isKycComplete,
  })

  // Fetch merchant deposit addresses from Cybrid
  const { data: depositAddressesData, isLoading: isLoadingDepositAddresses, error: depositAddressesError } = useQuery({
    queryKey: ['/api/merchant/deposit-addresses'],
    staleTime: 5 * 60 * 1000,
    enabled: isKycComplete,
  })

  const unifiedForm = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoNetworkCombined: "USDC-ethereum",
      fiatCurrency: "USD",
      payoutMethod: "credit_debit_card",
      walletAddress: "",
      customerEmail: "",
      bankAccount: ""
    }
  })

  // Create combined crypto-network options for dropdown with real API data
  const supportedCryptoNetworks = (() => {
    if (cryptoCurrenciesData && (cryptoCurrenciesData as any)?.response && Array.isArray((cryptoCurrenciesData as any).response)) {
      const currencies = (cryptoCurrenciesData as any).response;
      
      const cryptoNetworkCombinations: Array<{
        value: string;
        label: string;
        crypto: string;
        cryptoName: string;
        network: string;
        networkDisplayName: string;
        imageUrl: string;
        key: string;
      }> = [];

      currencies.forEach((currency: any, index: number) => {
        const cryptoSymbol = currency.symbol;
        const cryptoName = currency.name;
        const network = currency.network?.name;
        const imageUrl = currency.image?.thumb || currency.image?.small;
        
        if (cryptoSymbol && cryptoName && network && currency.isAllowed) {
          cryptoNetworkCombinations.push({
            value: `${cryptoSymbol}-${network}`,
            label: `${cryptoSymbol} ${cryptoName}`,
            crypto: cryptoSymbol,
            cryptoName: cryptoName,
            network: network,
            networkDisplayName: network,
            imageUrl: imageUrl || '',
            key: `${currency.uniqueId || cryptoSymbol}-${network}-${index}`
          });
        }
      });

      const uniqueCombinations = cryptoNetworkCombinations.filter((combo, index, self) => 
        index === self.findIndex(c => c.value === combo.value) && combo.crypto && combo.network
      );

      if (uniqueCombinations.length > 0) {
        return uniqueCombinations;
      }
    }

    // Fallback options if API fails
    return [
      { value: "USDC-ethereum", label: "USDC USD Coin", crypto: "USDC", cryptoName: "USD Coin", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-usdc-ethereum" },
      { value: "USDT-ethereum", label: "USDT Tether", crypto: "USDT", cryptoName: "Tether", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-usdt-ethereum" },
      { value: "ETH-ethereum", label: "ETH Ethereum", crypto: "ETH", cryptoName: "Ethereum", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-eth-ethereum" },
      { value: "BTC-mainnet", label: "BTC Bitcoin", crypto: "BTC", cryptoName: "Bitcoin", network: "mainnet", networkDisplayName: "Bitcoin", imageUrl: "", key: "fallback-btc-mainnet" }
    ];
  })()

  // Prepare deposit address options for dropdown from Cybrid
  const depositAddressOptions = (() => {
    if (!(depositAddressesData as any)?.success || !(depositAddressesData as any)?.addresses) {
      return []
    }
    
    return (depositAddressesData as any).addresses.map((addr: any) => ({
      value: addr.address,
      label: `${addr.asset} - ${addr.address.slice(0, 12)}...${addr.address.slice(-8)}`,
      asset: addr.asset,
      network: addr.network || 'ethereum',
      fullAddress: addr.address
    }))
  })()

  // Transform fiat currencies data for dropdown
  const supportedFiat = (fiatCurrenciesData as any)?.response?.map((fiat: { symbol: string, name: string }, index: number) => ({
    key: `${fiat.symbol}-${index}`,
    value: fiat.symbol,
    label: `${fiat.symbol} - ${fiat.name}`
  })).filter((fiat: { value: string, label: string, key: string }, index: number, self: any[]) => 
    index === self.findIndex((f: any) => f.value === fiat.value)
  ) || [
    { value: "USD", label: "USD - US Dollar", key: "fallback-usd" },
    { value: "EUR", label: "EUR - Euro", key: "fallback-eur" },
    { value: "GBP", label: "GBP - British Pound", key: "fallback-gbp" }
  ]

  // Unified payment methods from both providers
  const allPayoutMethods = (() => {
    const selectedFiat = unifiedForm.watch('fiatCurrency') || 'USD';
    
    // Base payment methods from API
    const payoutMethodsByFiat: { [key: string]: any[] } = {
      USD: [
        { 
          value: "credit_debit_card", 
          label: "Debit Card Payout", 
          shortLabel: "Debit Card",
          processingTime: "Real-time", 
          description: "Instant payout to your debit card (Visa/Mastercard)",
          coverage: "117 countries (Visa), 30 countries (Mastercard)",
          fee: "1% of transaction",
          provider: "transak"
        }
      ],
      EUR: [
        { 
          value: "sepa_bank_transfer", 
          label: "SEPA Bank Transfer", 
          shortLabel: "SEPA Transfer",
          processingTime: "1-2 business days", 
          description: "Transfer to European bank account",
          coverage: "40 EEA countries",
          fee: "1% of transaction",
          provider: "transak"
        }
      ],
      GBP: [
        { 
          value: "faster_payments", 
          label: "Faster Payments", 
          shortLabel: "Faster Payments",
          processingTime: "Real-time", 
          description: "Instant transfer to UK bank accounts",
          coverage: "UK only",
          fee: "1% of transaction", 
          provider: "transak"
        }
      ]
    };

    // Add Cybrid options
    const cybridMethods = [
      {
        value: "ach",
        label: "ACH Transfer",
        shortLabel: "ACH Transfer",
        processingTime: "Same day to 2 days",
        description: "Direct ACH transfer to your connected bank account",
        coverage: "US only",
        provider: "cybrid",
        fee: "$3.00 flat fee"
      },
      {
        value: "wire",
        label: "Wire Transfer",
        shortLabel: "Wire Transfer", 
        processingTime: "Same day",
        description: "Wire transfer to your connected bank account",
        coverage: "US only",
        provider: "cybrid",
        fee: "$25.00 flat fee"
      }
    ];

    const baseMethods = payoutMethodsByFiat[selectedFiat] || payoutMethodsByFiat.USD;
    return [...baseMethods, ...cybridMethods];
  })()

  // Get current fee info based on selected method
  const getCurrentFeeInfo = () => {
    const selectedMethod = allPayoutMethods.find((method: any) => method.value === unifiedForm.watch('payoutMethod'));
    return selectedMethod;
  }

  // Reset handlers and other functions would go here...
  const resetForms = () => {
    unifiedForm.reset()
    setPayoutDetails(null)
    setPaymentLink("")
    setQuoteDetails(null)
  }

  // Copy payment link to clipboard
  const copyPaymentLink = async () => {
    if (paymentLink) {
      try {
        await navigator.clipboard.writeText(paymentLink)
        toast({
          title: "Link Copied",
          description: "Payment link has been copied to clipboard.",
        })
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy link to clipboard.",
          variant: "destructive"
        })
      }
    }
  }

  // Real unified handler - calls actual Transak API
  const handleUnifiedPayout = async (data: any) => {
    setIsCreatingPayout(true)
    
    try {
      // Extract crypto currency and network from combined field
      const [cryptoCurrency, network] = data.cryptoNetworkCombined.split('-')
      
      // Get merchant email from profile or use form data
      const customerEmail = data.customerEmail || merchantProfile?.email || ''
      
      if (!customerEmail) {
        throw new Error('Customer email is required')
      }
      
      // Format request data according to createTransakSessionSchema
      const requestData = {
        quoteData: {
          cryptoAmount: parseFloat(data.cryptoAmount),
          cryptoCurrency: cryptoCurrency,
          fiatCurrency: data.fiatCurrency,
          network: network,
          paymentMethod: data.payoutMethod
        },
        walletAddress: data.walletAddress,
        customerEmail: customerEmail,
        referrerDomain: "ruupay.com",
        redirectURL: "https://ruupay.com/transaction-complete",
        themeColor: "1f4a8c"
      }
      
      console.log('[DEBUG] Creating payout session with data:', requestData)
      
      // Call the real API endpoint
      const response = await apiRequest("POST", "/api/merchant/transak/create-offramp-session", requestData)
      
      // Parse the JSON response
      const responseData = await response.json()
      console.log('[DEBUG] Payout session response:', responseData)
      
      // Set the real payment link from Transak
      setPaymentLink(responseData.widgetUrl)
      
      // Set payout details based on real response
      setPayoutDetails({
        id: responseData.widgetUrl ? responseData.widgetUrl.split('/').pop() || "payout_" + Math.random().toString(36).substr(2, 9) : "payout_" + Math.random().toString(36).substr(2, 9),
        cryptoAmount: data.cryptoAmount,
        fiatAmount: (parseFloat(data.cryptoAmount) * 1.02).toFixed(2), // TODO: Use real conversion rate
        payoutMethod: data.payoutMethod,
        processingTime: getCurrentFeeInfo()?.processingTime || "1-3 business days",
        status: "Processing"
      })
      
      setIsCreatingPayout(false)
      toast({
        title: "Payout Created",
        description: "Your crypto payout has been initiated successfully.",
      })
    } catch (error) {
      console.error('[ERROR] Failed to create payout session:', error)
      setIsCreatingPayout(false)
      toast({
        title: "Payout Failed",
        description: error instanceof Error ? error.message : "Failed to create payout session. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading merchant profile...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // KYC verification required
  if (!isKycComplete) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Crypto Payout</h1>
          <p className="text-muted-foreground">
            Convert your cryptocurrency to fiat currency
          </p>
        </div>

        <Alert data-testid="alert-kyc-required">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>KYC Verification Required</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              To access payout features and convert cryptocurrency to fiat currency, you must complete your business verification (KYC/KYB).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild data-testid="button-complete-kyc">
                <a href="/merchant/kyb-onboarding">
                  Complete Verification
                </a>
              </Button>
              <Button variant="outline" asChild data-testid="button-learn-more">
                <a href="/merchant/dashboard">
                  Return to Dashboard
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crypto Payout</h1>
        <p className="text-muted-foreground">
          Convert your cryptocurrency to fiat currency
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
            {Object.entries(mockAvailableBalance).map(([crypto, balance]) => (
              <div key={crypto} className="text-center p-3 border rounded-lg">
                <div className="font-mono text-lg font-bold">{balance}</div>
                <div className="text-sm text-muted-foreground">{crypto}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unified Crypto Payout Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Crypto Payout
            </CardTitle>
            <CardDescription>
              Convert your cryptocurrency to fiat currency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...unifiedForm}>
              <form onSubmit={unifiedForm.handleSubmit(handleUnifiedPayout)} className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={unifiedForm.control}
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
                    control={unifiedForm.control}
                    name="cryptoNetworkCombined"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cryptocurrency & Network</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger data-testid="select-crypto-network">
                              <SelectValue placeholder="Select cryptocurrency and network" />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedCryptoNetworks.map((option) => (
                                <SelectItem key={option.key} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <CryptoIcon 
                                      imageUrl={option.imageUrl} 
                                      crypto={option.crypto} 
                                      className="w-4 h-4" 
                                    />
                                    <span>{option.label}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {option.networkDisplayName}
                                    </Badge>
                                  </div>
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
                    control={unifiedForm.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          Your Wallet Address
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoadingDepositAddresses || depositAddressOptions.length === 0}
                            data-testid="select-wallet-address"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                isLoadingDepositAddresses 
                                  ? "Loading deposit addresses..." 
                                  : depositAddressOptions.length === 0 
                                    ? "No deposit addresses available" 
                                    : "Select a deposit address"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {depositAddressOptions.map((option: any) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={unifiedForm.control}
                      name="fiatCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Fiat Currency
                          </FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-fiat-currency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {supportedFiat.map((fiat: any) => (
                                  <SelectItem key={fiat.key} value={fiat.value}>
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
                      control={unifiedForm.control}
                      name="payoutMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                            <CreditCard className="h-4 w-4 text-purple-600" />
                            Payout Method
                          </FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-payout-method">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allPayoutMethods.map((method: any) => (
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

                  {/* Show bank account field for Cybrid methods */}
                  {getCurrentFeeInfo()?.provider === 'cybrid' && (
                    <FormField
                      control={unifiedForm.control}
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
                  )}

                  {/* Show customer email field for Transak methods */}
                  {getCurrentFeeInfo()?.provider === 'transak' && (
                    <FormField
                      control={unifiedForm.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                            <Banknote className="h-4 w-4 text-blue-600" />
                            Customer Email
                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="customer@example.com"
                              type="email"
                              {...field}
                              data-testid="input-customer-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Payment Method Details */}
                  {(() => {
                    const selectedMethod = getCurrentFeeInfo();
                    
                    if (!selectedMethod) return null;
                    
                    return (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                              <CreditCard className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-semibold text-sm">{selectedMethod.label}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs font-medium bg-white dark:bg-slate-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {selectedMethod.processingTime}
                            </Badge>
                            {selectedMethod.coverage && (
                              <Badge variant="secondary" className="text-xs font-medium">
                                {selectedMethod.coverage}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {selectedMethod.description}
                        </p>
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <span className="text-sm font-medium">Fee:</span>
                          <span className="text-sm font-bold text-red-600">{selectedMethod.fee}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <Button 
                  type="submit" 
                  disabled={isCreatingPayout}
                  className="w-full"
                  data-testid="button-create-payout"
                >
                  {isCreatingPayout && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Payout
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {payoutDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payout Created
              </CardTitle>
              <CardDescription>
                Your crypto payout has been initiated successfully
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
                    <Badge>{payoutDetails.payoutMethod.replace('_', ' ').toUpperCase()}</Badge>
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

              {paymentLink && (
                <div className="space-y-3">
                  <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Complete Your Payout</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Click the link below to visit the payment portal and complete your crypto payout.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        asChild 
                        className="flex-1"
                        data-testid="button-visit-payout-link"
                      >
                        <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Payout Link
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={copyPaymentLink}
                        data-testid="button-copy-payout-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={resetForms} className="w-full">
                Create Another Payout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}