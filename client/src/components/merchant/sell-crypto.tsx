import { useState, useEffect } from "react"
import { ArrowUpFromLine, Copy, ExternalLink, Loader2, CheckCircle, AlertTriangle, CreditCard, Smartphone, Building2, Clock, DollarSign } from "lucide-react"
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
import { apiRequest } from "@/lib/queryClient"

// Crypto Icon Component with real Transak images
const CryptoIcon = ({ imageUrl, crypto, className = "w-6 h-6" }: { imageUrl?: string, crypto: string, className?: string }) => {
  // Fallback color mapping for cryptocurrencies if image fails
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

  // If we have an image URL, use it
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={crypto}
        className={`${className} rounded-full object-cover`}
        onError={(e) => {
          // Fallback to colored circle if image fails to load
          const target = e.target as HTMLElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  // Fallback colored circle
  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center text-white text-sm font-bold`}
      style={{ backgroundColor: color }}
    >
      {crypto.slice(0, crypto.length > 4 ? 2 : crypto.length)}
    </div>
  );
};

export function SellCrypto() {
  const { toast } = useToast()
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false)
  const [paymentLink, setPaymentLink] = useState("")
  const [quoteDetails, setQuoteDetails] = useState<any>(null)
  const [walletValidation, setWalletValidation] = useState<{
    isValid: boolean | null;
    isValidating: boolean;
    error: string | null;
  }>({ isValid: null, isValidating: false, error: null })
  
  const form = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoNetworkCombined: "USDC-ethereum", // Combined format: crypto-network
      fiatCurrency: "USD",
      paymentMethod: "credit_debit_card",
      walletAddress: "",
      customerEmail: ""
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

  // Create combined crypto-network options for dropdown with real data
  const supportedCryptoNetworks = (() => {
    // Use the crypto-currencies endpoint which already has network and image data
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
        // Extract crypto info and network from real response
        const cryptoSymbol = currency.symbol;
        const cryptoName = currency.name;
        const network = currency.network?.name;
        const imageUrl = currency.image?.thumb || currency.image?.small;
        
        // Only include if crypto is allowed and has required fields
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

      // Remove duplicates by value and filter out invalid entries
      const uniqueCombinations = cryptoNetworkCombinations.filter((combo, index, self) => 
        index === self.findIndex(c => c.value === combo.value) && combo.crypto && combo.network
      );

      if (uniqueCombinations.length > 0) {
        return uniqueCombinations;
      }
    }

    // Fallback to common crypto-network combinations if API data not available
    const fallbackCombinations = [
      { value: "USDC-ethereum", label: "USDC (Ethereum)", crypto: "USDC", cryptoName: "USD Coin", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "usdc-ethereum" },
      { value: "USDT-ethereum", label: "USDT (Ethereum)", crypto: "USDT", cryptoName: "Tether", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "usdt-ethereum" },
      { value: "ETH-ethereum", label: "ETH (Ethereum)", crypto: "ETH", cryptoName: "Ethereum", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "eth-ethereum" },
      { value: "BTC-bitcoin", label: "BTC (Bitcoin)", crypto: "BTC", cryptoName: "Bitcoin", network: "bitcoin", networkDisplayName: "Bitcoin", imageUrl: "", key: "btc-bitcoin" },
      { value: "USDC-polygon", label: "USDC (Polygon)", crypto: "USDC", cryptoName: "USD Coin", network: "polygon", networkDisplayName: "Polygon", imageUrl: "", key: "usdc-polygon" }
    ];
    
    return fallbackCombinations;
  })()

  // Get USD payment methods from Transak API that support sell orders
  const supportedPaymentMethods: Array<{
    value: string;
    label: string;
    icon: any;
    processingTime: string;
  }> = (() => {
    console.log('[SellCrypto] fiatCurrenciesData:', fiatCurrenciesData ? 'Available' : 'No fiatCurrenciesData available');
    
    if (fiatCurrenciesData && (fiatCurrenciesData as any)?.response) {
      const currencies = (fiatCurrenciesData as any).response;
      
      // Find USD currency
      const usdCurrency = currencies.find((curr: any) => curr.symbol === 'USD');
      
      if (usdCurrency && usdCurrency.supportedPaymentMethods) {
        // For sell orders, we want payment methods that support payouts (isPayOutAllowed: true)
        const availableMethodIds = usdCurrency.supportedPaymentMethods
          .filter((method: any) => method.isPayOutAllowed === true)
          .map((method: any) => method.id);
        
        console.log('[SellCrypto] Available payment method IDs from API:', availableMethodIds);
        
        const methodMap: { [key: string]: { label: string; icon: any; processingTime: string } } = {
          'credit_debit_card': { label: 'Credit/Debit Card', icon: CreditCard, processingTime: '1-3 minutes' },
          'apple_pay': { label: 'Apple Pay', icon: Smartphone, processingTime: '1-3 minutes' },
          'google_pay': { label: 'Google Pay', icon: Smartphone, processingTime: '1-3 minutes' },
          'pm_wire': { label: 'Wire Transfer', icon: Building2, processingTime: '1-2 business days' }
        };
        
        // Filter methods to only include those available in the API AND in our hardcoded list
        const supportedMethods = availableMethodIds.filter((id: string) => methodMap[id]);
        
        if (supportedMethods.length > 0) {
          return supportedMethods.map((id: string) => ({
            value: id,
            ...methodMap[id]
          }));
        }
      }
    }
    
    // Fallback to hardcoded methods if API data unavailable
    const hardcodedMethodIds = ['credit_debit_card', 'apple_pay', 'google_pay', 'pm_wire'];
    console.log('[SellCrypto] Hardcoded payment method IDs:', hardcodedMethodIds);
    console.log('[SellCrypto] Using fallback hardcoded methods');
    
    return [
      { value: 'credit_debit_card', label: 'Credit/Debit Card', icon: CreditCard, processingTime: '1-3 minutes' },
      { value: 'apple_pay', label: 'Apple Pay', icon: Smartphone, processingTime: '1-3 minutes' },
      { value: 'google_pay', label: 'Google Pay', icon: Smartphone, processingTime: '1-3 minutes' },
      { value: 'pm_wire', label: 'Wire Transfer', icon: Building2, processingTime: '1-2 business days' }
    ];
  })()

  console.log('[SellCrypto] supportedPaymentMethods for', form.watch('fiatCurrency'), ':', supportedPaymentMethods);

  if (supportedPaymentMethods.length === 0) {
    console.log('[SellCrypto] No supportedPaymentMethods found for', form.watch('fiatCurrency'));
  }

  // Debounced quote fetching for SELL orders
  useEffect(() => {
    const cryptoAmount = form.watch('cryptoAmount')
    const cryptoNetworkCombined = form.watch('cryptoNetworkCombined')
    const fiatCurrency = form.watch('fiatCurrency')
    const paymentMethod = form.watch('paymentMethod')

    if (!cryptoAmount || !cryptoNetworkCombined || !fiatCurrency || !paymentMethod) {
      setQuoteDetails(null)
      return
    }

    const [cryptoCurrency, network] = cryptoNetworkCombined.split('-')
    if (!cryptoCurrency || !network) return

    const debounceTimer = setTimeout(async () => {
      setIsLoadingQuote(true)
      try {
        const response = await apiRequest('POST', '/api/merchant/transak/pricing-quote', {
          cryptoAmount,
          cryptoNetworkCombined,
          fiatCurrency,
          paymentMethod,
          orderType: 'SELL' // Specify SELL order type
        })
        
        const quoteData = await response.json()
        setQuoteDetails(quoteData)
      } catch (error) {
        console.error('Failed to fetch sell quote:', error)
        setQuoteDetails(null)
      } finally {
        setIsLoadingQuote(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(debounceTimer)
  }, [form.watch('cryptoAmount'), form.watch('cryptoNetworkCombined'), form.watch('fiatCurrency'), form.watch('paymentMethod')])

  // Real-time wallet address validation
  useEffect(() => {
    const walletAddress = form.watch('walletAddress')
    const cryptoNetworkCombined = form.watch('cryptoNetworkCombined')

    if (!walletAddress || !cryptoNetworkCombined) {
      setWalletValidation({ isValid: null, isValidating: false, error: null })
      return
    }

    const [cryptoCurrency, network] = cryptoNetworkCombined.split('-')
    if (!cryptoCurrency || !network) return

    const validateTimer = setTimeout(async () => {
      setWalletValidation({ isValid: null, isValidating: true, error: null })
      
      try {
        const response = await apiRequest('POST', '/api/public/transak/verify-wallet-address', {
          cryptoCurrency,
          network,
          walletAddress
        })
        
        const validation = await response.json()
        if (validation.response?.isValid) {
          setWalletValidation({ isValid: true, isValidating: false, error: null })
        } else {
          setWalletValidation({ 
            isValid: false, 
            isValidating: false, 
            error: validation.response?.message || 'Invalid wallet address' 
          })
        }
      } catch (error) {
        setWalletValidation({ 
          isValid: false, 
          isValidating: false, 
          error: 'Failed to validate wallet address' 
        })
      }
    }, 800) // 800ms debounce for wallet validation

    return () => clearTimeout(validateTimer)
  }, [form.watch('walletAddress'), form.watch('cryptoNetworkCombined')])

  const handleSellCrypto = async (data: any) => {
    setIsCreatingPaymentLink(true)
    
    try {
      if (!quoteDetails) {
        throw new Error("Please get a pricing quote first before creating the payment link")
      }

      const [cryptoCurrency, network] = data.cryptoNetworkCombined.split('-')
      
      // Create actual Transak SELL session using the session creation API
      const sessionRequest = {
        quoteData: {
          cryptoAmount: parseFloat(data.cryptoAmount),
          cryptoCurrency: cryptoCurrency,
          fiatCurrency: data.fiatCurrency,
          network: network,
          paymentMethod: data.paymentMethod,
          partnerOrderId: `sell_order_${Date.now()}`
        },
        walletAddress: data.walletAddress,
        customerEmail: data.customerEmail,
        orderType: 'SELL' // Critical: Specify SELL order type
      }

      console.log('[DEBUG] Creating SELL session with request:', JSON.stringify(sessionRequest, null, 2))

      const response = await apiRequest('POST', '/api/merchant/transak/create-session', sessionRequest)
      const sessionData = await response.json()
      
      if (!sessionData.success || !sessionData.widgetUrl) {
        throw new Error("Failed to create session: Invalid response from API")
      }

      console.log('[DEBUG] SELL session created successfully:', sessionData)
      
      setPaymentLink(sessionData.widgetUrl)
      
      toast({
        title: "Sell Crypto Link Created",
        description: "Share this link with your customer to complete their crypto sale via Transak.",
      })
      
    } catch (error) {
      console.error('[ERROR] Failed to create SELL session:', error)
      toast({
        title: "Link Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create sell crypto link. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingPaymentLink(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The sell crypto link has been copied to your clipboard.",
    })
  }

  const resetForm = () => {
    form.reset()
    setPaymentLink("")
    setQuoteDetails(null)
    setWalletValidation({ isValid: null, isValidating: false, error: null })
  }

  if (!merchantStatus.kybCompleted || !merchantStatus.custodianAccountCreated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sell Crypto</h1>
          <p className="text-muted-foreground">
            Enable customers to sell their cryptocurrency for fiat currency
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Account Setup Required
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Complete your KYB verification and create a custodian account to access sell crypto functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!merchantStatus.kybCompleted && (
              <Button asChild variant="outline" data-testid="button-complete-kyb">
                <a href="/merchant/onboarding">Complete KYB Verification</a>
              </Button>
            )}
            {!merchantStatus.custodianAccountCreated && (
              <Button asChild variant="outline" data-testid="button-create-custodian">
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
        <h1 className="text-3xl font-bold">Sell Crypto</h1>
        <p className="text-muted-foreground">
          Create secure payment links for customers to sell their cryptocurrency for fiat currency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sell Crypto Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Sell Crypto Configuration
            </CardTitle>
            <CardDescription>
              Configure the crypto sale details and generate a payment link for your customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSellCrypto)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cryptoAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Crypto Amount to Sell</FormLabel>
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
                    name="cryptoNetworkCombined"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cryptocurrency & Network</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-crypto-network">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedCryptoNetworks.map((combo) => (
                                <SelectItem key={combo.key} value={combo.value}>
                                  <div className="flex items-center gap-2">
                                    <CryptoIcon 
                                      imageUrl={combo.imageUrl} 
                                      crypto={combo.crypto} 
                                      className="w-4 h-4" 
                                    />
                                    <span>{combo.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {combo.networkDisplayName}
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
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
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
                        <FormLabel>Payout Method</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedPaymentMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  <div className="flex items-center gap-2">
                                    <method.icon className="h-4 w-4" />
                                    <span>{method.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {method.processingTime}
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
                </div>

                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Wallet Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter the customer's wallet address to receive crypto from"
                            {...field}
                            data-testid="input-wallet-address"
                            className={walletValidation.isValid === false ? 'border-red-500' : 
                                      walletValidation.isValid === true ? 'border-green-500' : ''}
                          />
                          {walletValidation.isValidating && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {walletValidation.isValid === true && (
                            <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                          )}
                          {walletValidation.isValid === false && (
                            <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </FormControl>
                      {walletValidation.error && (
                        <p className="text-sm text-red-600" data-testid="text-wallet-error">{walletValidation.error}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
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

                <Button 
                  type="submit" 
                  disabled={isCreatingPaymentLink || walletValidation.isValid !== true}
                  className="w-full"
                  data-testid="button-create-sell-link"
                >
                  {isCreatingPaymentLink && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Sell Crypto Link
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quote Display & Generated Link */}
        <div className="space-y-4">
          {/* Real-time Quote */}
          {(quoteDetails || isLoadingQuote) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Sell Quote
                  {isLoadingQuote && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Real-time pricing for selling crypto to fiat
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingQuote ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  </div>
                ) : quoteDetails ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Selling:</span>
                          <span className="font-mono" data-testid="text-selling-amount">
                            {form.watch('cryptoAmount')} {form.watch('cryptoNetworkCombined')?.split('-')[0]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer Gets:</span>
                          <span className="font-mono font-medium text-green-600" data-testid="text-fiat-amount">
                            {quoteDetails.fiatAmount} {quoteDetails.fiatCurrency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Rate:</span>
                          <span className="font-mono text-xs" data-testid="text-exchange-rate">
                            1 {quoteDetails.cryptoCurrency} = {quoteDetails.conversionPrice} {quoteDetails.fiatCurrency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Fee:</span>
                          <span className="font-mono text-red-600" data-testid="text-processing-fee">
                            {quoteDetails.totalFee} {quoteDetails.fiatCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Quote ID: {quoteDetails.id} • Valid for 30 seconds
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Enter crypto amount to see sell quote</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generated Payment Link */}
          {paymentLink && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  Sell Crypto Link Ready
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Share this secure link with your customer to complete their crypto sale
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                  <p className="text-sm font-mono break-all" data-testid="text-payment-link">{paymentLink}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => copyToClipboard(paymentLink)} 
                    variant="outline" 
                    className="flex-1"
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button 
                    onClick={() => window.open(paymentLink, '_blank')} 
                    variant="outline" 
                    className="flex-1"
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Link
                  </Button>
                </div>
                
                <Button variant="outline" onClick={resetForm} className="w-full" data-testid="button-create-another">
                  Create Another Sell Link
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}