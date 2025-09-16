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

export function ReceiveCrypto() {
  const { toast } = useToast()
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
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

  // Fetch countries from Transak API
  const { data: countriesData, isLoading: isLoadingCountries, error: countriesError } = useQuery({
    queryKey: ['/api/public/transak/countries'],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })

  // Fetch networks from Transak API
  const { data: networksData, isLoading: isLoadingNetworks, error: networksError } = useQuery({
    queryKey: ['/api/public/transak/networks'],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })

  // Use the existing crypto-currencies endpoint which has all the data we need
  // (The /getcurrencies endpoint doesn't exist in Transak API)

  // Create combined crypto-network options for dropdown with real getcurrencies data
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
        // Extract crypto info and network from real getcurrencies response
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
            networkDisplayName: network, // Use network name as display name
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

    // Fallback to old method if getcurrencies not available
    const cryptos = (cryptoCurrenciesData as any)?.response || [];
    
    // Common network mappings with display names
    const commonNetworks = [
      { code: 'ethereum', name: 'Ethereum', cryptos: ['USDC', 'USDT', 'ETH', 'WBTC', 'DAI'] },
      { code: 'polygon', name: 'Polygon', cryptos: ['USDC', 'USDT', 'MATIC', 'DAI'] },
      { code: 'binance', name: 'BNB Chain', cryptos: ['USDC', 'USDT', 'BNB'] },
      { code: 'arbitrum', name: 'Arbitrum', cryptos: ['USDC', 'USDT', 'ETH'] },
      { code: 'optimism', name: 'Optimism', cryptos: ['USDC', 'USDT', 'ETH'] },
      { code: 'bitcoin', name: 'Bitcoin', cryptos: ['BTC'] },
      { code: 'solana', name: 'Solana', cryptos: ['SOL', 'USDC'] },
      { code: 'avalanche', name: 'Avalanche', cryptos: ['AVAX', 'USDC'] }
    ];
    
    const combinations: Array<{
      value: string;
      label: string;
      crypto: string;
      cryptoName: string;
      network: string;
      networkDisplayName: string;
      imageUrl: string;
      key: string;
    }> = [];
    
    // Create crypto-network combinations
    cryptos.forEach((crypto: { symbol: string, name: string }, cryptoIndex: number) => {
      // Find networks that support this crypto
      const supportingNetworks = commonNetworks.filter(network => 
        network.cryptos.includes(crypto.symbol)
      );
      
      // If no specific networks found, default to ethereum for ERC-20 tokens and bitcoin for BTC
      if (supportingNetworks.length === 0) {
        const defaultNetwork = crypto.symbol === 'BTC' ? 'bitcoin' : 'ethereum';
        const defaultNetworkName = crypto.symbol === 'BTC' ? 'Bitcoin' : 'Ethereum';
        supportingNetworks.push({ code: defaultNetwork, name: defaultNetworkName, cryptos: [crypto.symbol] });
      }
      
      supportingNetworks.forEach((network, networkIndex: number) => {
        combinations.push({
          value: `${crypto.symbol}-${network.code}`,
          label: `${crypto.symbol} ${crypto.name || crypto.symbol}`,
          crypto: crypto.symbol,
          cryptoName: crypto.name || crypto.symbol,
          network: network.code,
          networkDisplayName: network.name,
          imageUrl: '', // No image URL in fallback
          key: `${crypto.symbol}-${network.code}-${cryptoIndex}-${networkIndex}`
        });
      });
    });

    // Remove duplicates and return, or use fallback
    return combinations.filter((combo, index, self) => 
      index === self.findIndex(c => c.value === combo.value)
    ).length > 0 ? combinations : [
      // Fallback options if API fails
      { value: "USDC-ethereum", label: "USDC USD Coin", crypto: "USDC", cryptoName: "USD Coin", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-usdc-ethereum" },
      { value: "USDT-ethereum", label: "USDT Tether", crypto: "USDT", cryptoName: "Tether", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-usdt-ethereum" },
      { value: "ETH-ethereum", label: "ETH Ethereum", crypto: "ETH", cryptoName: "Ethereum", network: "ethereum", networkDisplayName: "Ethereum", imageUrl: "", key: "fallback-eth-ethereum" },
      { value: "BTC-mainnet", label: "BTC Bitcoin", crypto: "BTC", cryptoName: "Bitcoin", network: "mainnet", networkDisplayName: "Bitcoin", imageUrl: "", key: "fallback-btc-mainnet" }
    ];
  })()

  // Transform fiat currencies data for dropdown - ensure unique keys
  const supportedFiat = (fiatCurrenciesData as any)?.response?.map((fiat: { symbol: string, name: string }, index: number) => ({
    value: fiat.symbol,
    label: `${fiat.symbol} - ${fiat.name}`,
    key: `${fiat.symbol}-${index}` // Add unique key to prevent React warnings
  })).filter((fiat: { value: string, label: string, key: string }, index: number, self: any[]) => 
    index === self.findIndex((f: any) => f.value === fiat.value) // Remove duplicates
  ) || [
    // Fallback options if API fails
    { value: "USD", label: "USD - US Dollar", key: "fallback-usd" },
    { value: "EUR", label: "EUR - Euro", key: "fallback-eur" },
    { value: "GBP", label: "GBP - British Pound", key: "fallback-gbp" }
  ]

  // Collect all payment methods from all currencies in Transak API response
  const paymentMethods = (() => {
    const allMethodsMap = new Map<string, string>()
    
    // Extract all payment methods from all currencies
    if ((fiatCurrenciesData as any)?.response) {
      (fiatCurrenciesData as any).response.forEach((fiat: { supportedPaymentMethods?: any[] }) => {
        if (fiat.supportedPaymentMethods) {
          fiat.supportedPaymentMethods.forEach((method: any) => {
            if (method.id && method.name) {
              allMethodsMap.set(method.id, method.name)
            }
          })
        }
      })
    }
    
    // Convert map to array format for dropdown
    const methodsFromAPI = Array.from(allMethodsMap.entries()).map(([id, name]) => ({
      value: id,
      label: name
    }))
    
    // Return API methods if available, otherwise fallback
    return methodsFromAPI.length > 0 ? methodsFromAPI : [
      { value: "credit_debit_card", label: "Credit/Debit Card" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "wire_transfer", label: "Wire Transfer" },
      { value: "apple_pay", label: "Apple Pay" },
      { value: "google_pay", label: "Google Pay" }
    ]
  })()

  // Wallet validation function using combined crypto-network selection
  const validateWalletAddress = async (address: string, cryptoNetworkCombined: string) => {
    if (!address || !cryptoNetworkCombined) return
    
    // Parse crypto and network from combined value (e.g., "USDC-ethereum")
    const [cryptoCurrency, network] = cryptoNetworkCombined.split('-')
    if (!cryptoCurrency || !network) return
    
    setWalletValidation({ isValid: null, isValidating: true, error: null })
    
    try {
      const response = await fetch(
        `/api/public/transak/verify-wallet-address?cryptoCurrency=${cryptoCurrency}&network=${network}&walletAddress=${address}`
      )
      
      if (!response.ok) {
        throw new Error('Validation failed')
      }
      
      const result = await response.json()
      setWalletValidation({ 
        isValid: result.isValid === true, 
        isValidating: false, 
        error: result.isValid === false ? 'Invalid wallet address' : null 
      })
    } catch (error) {
      setWalletValidation({ 
        isValid: false, 
        isValidating: false, 
        error: 'Unable to validate wallet address' 
      })
    }
  }

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
      // Call real Transak pricing API using platform-wide credentials
      const response = await apiRequest('POST', '/api/merchant/transak/pricing-quote', {
        cryptoAmount: data.cryptoAmount,
        cryptoNetworkCombined: data.cryptoNetworkCombined,
        fiatCurrency: data.fiatCurrency,
        paymentMethod: data.paymentMethod
      })

      if (!response.ok) {
        throw new Error('Failed to get pricing quote from server')
      }

      const transakQuote = await response.json()

      // Parse crypto and network from combined value for UI display
      const [cryptoCurrency, network] = data.cryptoNetworkCombined.split('-')
      
      // Transform Transak response to match current UI expectations
      const transformedQuote = {
        id: "quote_" + Date.now(),
        partnerOrderId: "order_" + Date.now(),
        cryptoAmount: transakQuote.cryptoAmount || data.cryptoAmount,
        cryptoCurrency: cryptoCurrency,
        fiatAmount: transakQuote.fiatAmount || transakQuote.totalAmount || "0.00", 
        fiatCurrency: transakQuote.fiatCurrency || data.fiatCurrency,
        paymentMethod: data.paymentMethod,
        fees: {
          transakFee: transakQuote.partnerFee || transakQuote.transakFee || transakQuote.fee || "0.00",
          networkFee: transakQuote.networkFee || "0.00"
        },
        conversionRate: transakQuote.conversionRate || transakQuote.rate || 0,
        validUntil: transakQuote.validUntil || transakQuote.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        network: network
      }

      setQuoteDetails(transformedQuote)
      
      // Generate payment link with Transak widget parameters
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://global.transak.com' 
        : 'https://global-stg.transak.com'
        
      const params = new URLSearchParams({
        apiKey: import.meta.env.VITE_TRANSAK_API_KEY || 'transak_staging_key',
        cryptoAmount: data.cryptoAmount,
        cryptoCurrency: cryptoCurrency,
        fiatCurrency: data.fiatCurrency,
        paymentMethod: data.paymentMethod,
        network: transformedQuote.network,
        partnerOrderId: transformedQuote.partnerOrderId,
        email: data.customerEmail || '',
        walletAddress: data.walletAddress || '',
        disableWalletAddressForm: (data.walletAddress && walletValidation.isValid) ? 'true' : 'false'
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
                              {supportedCryptoNetworks.map((cryptoNetwork) => (
                                <SelectItem key={cryptoNetwork.key} value={cryptoNetwork.value} className="flex justify-between items-center py-3">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      <CryptoIcon 
                                        imageUrl={cryptoNetwork.imageUrl} 
                                        crypto={cryptoNetwork.crypto} 
                                        className="w-6 h-6 flex-shrink-0" 
                                      />
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{cryptoNetwork.crypto}</span>
                                        <span className="text-muted-foreground">{cryptoNetwork.cryptoName}</span>
                                      </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground ml-4">{cryptoNetwork.networkDisplayName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {isLoadingNetworks && (
                          <p className="text-sm text-muted-foreground">Loading networks...</p>
                        )}
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
                              {supportedFiat.map((fiat: { value: string, label: string, key?: string }) => (
                                <SelectItem key={fiat.key || fiat.value} value={fiat.value}>
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
                        {paymentMethods.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No payment methods available for selected currency
                          </p>
                        )}
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

                  <FormField
                    control={form.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Wallet Address
                          {walletValidation.isValidating && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {walletValidation.isValid === true && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {walletValidation.isValid === false && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter customer's wallet address"
                            {...field}
                            onBlur={() => {
                              field.onBlur()
                              validateWalletAddress(field.value, form.watch("cryptoNetworkCombined"))
                            }}
                            data-testid="input-wallet-address"
                          />
                        </FormControl>
                        <FormMessage />
                        {walletValidation.error && (
                          <p className="text-sm text-red-500">{walletValidation.error}</p>
                        )}
                        {walletValidation.isValid === true && (
                          <p className="text-sm text-green-500">Valid wallet address</p>
                        )}
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