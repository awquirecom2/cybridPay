import { useState, useEffect } from "react"
import { ArrowDownToLine, Copy, ExternalLink, Loader2, CheckCircle, AlertTriangle, CreditCard, Smartphone, Building2, Clock, DollarSign, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useMerchantProfile } from "@/hooks/use-merchant-profile"

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
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false)
  const [paymentLink, setPaymentLink] = useState("")
  const [quoteDetails, setQuoteDetails] = useState<any>(null)
  // Removed wallet validation state since we'll use dropdown with valid addresses only

  // Check merchant KYC status
  const { merchant, isKycComplete, kycStatus, isLoading: isLoadingProfile } = useMerchantProfile()
  
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

  // Use real merchant data instead of hardcoded status
  // Note: merchantStatus replaced by useMerchantProfile hook above

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

  // Fetch merchant deposit addresses from Cybrid (only when KYC is complete)
  const { data: depositAddressesData, isLoading: isLoadingDepositAddresses, error: depositAddressesError } = useQuery({
    queryKey: ['/api/merchant/deposit-addresses'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isKycComplete, // Only fetch when KYC is verified
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

  // USD payment methods using exact Transak API payment method IDs
  const usdPaymentMethods = [
    {
      value: "credit_debit_card",
      label: "Credit/Debit Card",
      description: "Visa, Mastercard accepted",
      processingTime: "1-3 minutes",
      feeLevel: "Higher",
      icon: CreditCard,
      minimumAmount: "$5",
      maximumAmount: "$3,000",
      dailyLimit: "$25,000",
      note: "Most convenient option with instant processing"
    },
    {
      value: "apple_pay",
      label: "Apple Pay",
      description: "Quick payment via Apple devices",
      processingTime: "1-4 minutes",
      feeLevel: "Standard",
      icon: Smartphone,
      minimumAmount: "$30",
      maximumAmount: "$1,000",
      dailyLimit: "$25,000",
      note: "Secure and convenient for Apple users"
    },
    {
      value: "google_pay",
      label: "Google Pay",
      description: "Quick payment via Google wallet",
      processingTime: "1-4 minutes",
      feeLevel: "Standard",
      icon: Smartphone,
      minimumAmount: "$30",
      maximumAmount: "$1,000",
      dailyLimit: "$25,000",
      note: "Fast checkout with Google services"
    },
    {
      value: "pm_wire",
      label: "Wire Transfer",
      description: "Direct bank-to-bank transfer",
      processingTime: "1-2 days",
      feeLevel: "Lower",
      icon: Building2,
      minimumAmount: "$20",
      maximumAmount: "$75,000",
      dailyLimit: "$75,000",
      note: "High-value transfers with delayed processing"
    }
  ]

  // Filter methods based on API availability or use all USD methods (excluding wire transfer)
  const paymentMethods = (() => {
    // First filter out wire transfer from the base methods
    const filteredUsdMethods = usdPaymentMethods.filter(method => method.value !== "pm_wire")
    
    // Check if we have API data for USD payment methods
    const allMethodsMap = new Map<string, string>()
    
    // Extract USD-specific payment methods from API if available
    if ((fiatCurrenciesData as any)?.response) {
      const usdFiat = (fiatCurrenciesData as any).response.find((fiat: any) => fiat.symbol === 'USD')
      if (usdFiat?.supportedPaymentMethods) {
        console.log('[ReceiveCrypto] USD supported payment methods from Transak API:', usdFiat.supportedPaymentMethods)
        usdFiat.supportedPaymentMethods.forEach((method: any) => {
          if (method.id && method.name) {
            allMethodsMap.set(method.id, method.name)
            console.log('[ReceiveCrypto] Found payment method:', method.id, method.name)
          }
        })
      } else {
        console.log('[ReceiveCrypto] No supportedPaymentMethods found for USD')
      }
    } else {
      console.log('[ReceiveCrypto] No fiatCurrenciesData available')
    }
    
    console.log('[ReceiveCrypto] Available payment method IDs from API:', Array.from(allMethodsMap.keys()))
    console.log('[ReceiveCrypto] Hardcoded payment method IDs:', filteredUsdMethods.map(m => m.value))
    
    // Filter our USD methods to only include those supported by API (if available)
    if (allMethodsMap.size > 0) {
      const validMethods = filteredUsdMethods.filter(method => allMethodsMap.has(method.value))
      console.log('[ReceiveCrypto] Using filtered valid methods:', validMethods.map(m => m.value))
      return validMethods
    }
    
    // Return filtered USD methods if no API data available
    console.log('[ReceiveCrypto] Using fallback hardcoded methods (excluding wire)')
    return filteredUsdMethods
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
      network: addr.network || 'ethereum', // Default to ethereum if network not specified
      fullAddress: addr.address
    }))
  })()

  // Real-time quote fetching function (without creating payment link)
  const fetchQuote = async (formData: any) => {
    if (!formData.cryptoAmount || !formData.cryptoNetworkCombined || !formData.fiatCurrency || !formData.paymentMethod) {
      setQuoteDetails(null)
      return
    }

    if (!isKycComplete) {
      return
    }

    setIsLoadingQuote(true)
    console.log('Fetching real-time quote with data:', formData)

    try {
      const response = await apiRequest('POST', '/api/merchant/transak/pricing-quote', {
        cryptoAmount: formData.cryptoAmount,
        cryptoNetworkCombined: formData.cryptoNetworkCombined,
        fiatCurrency: formData.fiatCurrency,
        paymentMethod: formData.paymentMethod
      })

      if (!response.ok) {
        throw new Error('Failed to get pricing quote from server')
      }

      const transakQuote = await response.json()
      console.log('Received real-time quote:', transakQuote)

      const [cryptoCurrency, network] = formData.cryptoNetworkCombined.split('-')
      
      const formattedQuote = {
        ...transakQuote,
        cryptoCurrency: cryptoCurrency,
        network: network
      }

      setQuoteDetails(formattedQuote)
    } catch (error) {
      console.error('Error fetching real-time quote:', error)
      setQuoteDetails(null)
    } finally {
      setIsLoadingQuote(false)
    }
  }

  // Watch form changes and trigger real-time quote updates with debouncing
  const formValues = form.watch()
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchQuote(formValues)
    }, 500) // 500ms debounce

    return () => clearTimeout(debounceTimer)
  }, [formValues.cryptoAmount, formValues.cryptoNetworkCombined, formValues.fiatCurrency, formValues.paymentMethod, isKycComplete])

  // Function to create Transak session with fresh quote to ensure no stale data
  const handleCreatePaymentLink = async (data: any) => {
    if (!isKycComplete) {
      toast({
        title: "KYB Verification Required",
        description: "Please complete your KYB verification before creating payment links.",
        variant: "destructive"
      })
      return
    }

    // Check if current form values match the displayed quote to prevent stale quote usage
    if (!quoteDetails || 
        isLoadingQuote || 
        !data.cryptoAmount || 
        !data.cryptoNetworkCombined || 
        !data.fiatCurrency || 
        !data.paymentMethod) {
      toast({
        title: "Please Wait",
        description: "Quote is updating. Please wait for the latest pricing before creating a payment link.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingPaymentLink(true)
    console.log('Creating Transak session with fresh quote verification')

    try {
      // Fetch fresh quote with current form values to prevent stale data
      const quoteResponse = await apiRequest('POST', '/api/merchant/transak/pricing-quote', {
        cryptoAmount: data.cryptoAmount,
        cryptoNetworkCombined: data.cryptoNetworkCombined,
        fiatCurrency: data.fiatCurrency,
        paymentMethod: data.paymentMethod
      })

      if (!quoteResponse.ok) {
        throw new Error('Failed to get fresh pricing quote')
      }

      const freshQuote = await quoteResponse.json()
      const [cryptoCurrency, network] = data.cryptoNetworkCombined.split('-')
      
      const formattedQuote = {
        ...freshQuote,
        cryptoCurrency: cryptoCurrency,
        network: network
      }

      // Update the displayed quote with fresh data
      setQuoteDetails(formattedQuote)

      // Create Transak session using the fresh quote data
      const sessionResponse = await apiRequest('POST', '/api/merchant/transak/create-session', {
        quoteData: {
          fiatAmount: formattedQuote.fiatAmount,
          cryptoCurrency: formattedQuote.cryptoCurrency,
          fiatCurrency: formattedQuote.fiatCurrency,
          network: formattedQuote.network,
          paymentMethod: formattedQuote.paymentMethod,
          partnerOrderId: formattedQuote.partnerOrderId
        },
        walletAddress: data.walletAddress || '',
        customerEmail: data.customerEmail || '',
        referrerDomain: window.location.hostname,
        redirectURL: `${window.location.origin}/transaction-complete`,
        themeColor: "1f4a8c"
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create Transak session')
      }

      const sessionData = await sessionResponse.json()
      
      // Check if request was successful
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Session creation failed')
      }
      
      // Extract widget URL from normalized response format
      const widgetUrl = sessionData.widgetUrl
      
      if (!widgetUrl) {
        console.error('Transak session response:', sessionData)
        throw new Error('No widget URL received from Transak session')
      }

      setPaymentLink(widgetUrl)
      
      toast({
        title: "Payment Session Created",
        description: "Share this link with your customer to complete the payment.",
      })
      
    } catch (error) {
      console.error('Error creating Transak session:', error)
      
      // Enhanced error handling with specific error messages
      let errorMessage = "Failed to create payment session. Please try again."
      let errorTitle = "Session Creation Failed"
      
      if (error instanceof Error) {
        if (error.message.includes('Payment provider error')) {
          errorTitle = "Payment Provider Error"
          errorMessage = "There was an issue with the payment provider. Please try again later."
        } else if (error.message.includes('Invalid request data')) {
          errorTitle = "Invalid Data"
          errorMessage = "Please check all required fields and try again."
        } else if (error.message.includes('No widget URL')) {
          errorTitle = "Session Error"
          errorMessage = "Payment session was created but no payment link was received. Please try again."
        } else if (error.message.includes('Session creation failed')) {
          errorTitle = "Creation Failed" 
          errorMessage = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCreatingPaymentLink(false)
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

  // Show loading state while fetching profile
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading merchant profile...</span>
      </div>
    )
  }

  // Show KYC gating UI if not complete
  if (!isKycComplete) {
    const getKycMessage = () => {
      if (kycStatus.status === 'pending') {
        return "Your KYB verification is currently being processed."
      } else if (kycStatus.status === 'review') {
        return "Your KYB verification is under review."
      } else if (kycStatus.status === 'failed') {
        return "Your KYB verification failed. Please try again."
      }
      return "Complete your KYB verification to access onramp and offramp features."
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Receive Crypto</h1>
          <p className="text-muted-foreground">
            Generate payment links for customers to send you cryptocurrency
          </p>
        </div>

        <Alert data-testid="alert-kyc-required">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>KYB Verification Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{getKycMessage()}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild data-testid="button-complete-kyb">
                <a href="/merchant/kyb-onboarding">
                  {kycStatus.status === 'failed' ? 'Retry KYB Verification' : 'Complete KYB Verification'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" asChild data-testid="button-view-accounts">
                <a href="/merchant/accounts">
                  View Account Status
                  <ExternalLink className="h-4 w-4 ml-2" />
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
              <form onSubmit={form.handleSubmit(handleCreatePaymentLink)} className="space-y-4">
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
                      <FormItem className="col-span-2">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-payment-method" className="min-h-16">
                              <SelectValue>
                                {field.value && (() => {
                                  const selectedMethod = paymentMethods.find(m => m.value === field.value)
                                  if (selectedMethod) {
                                    const IconComponent = selectedMethod.icon
                                    return (
                                      <div className="flex items-center gap-3">
                                        <IconComponent className="h-5 w-5 text-primary" />
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium">{selectedMethod.label}</span>
                                          <span className="text-sm text-muted-foreground">{selectedMethod.description}</span>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((method) => {
                                const IconComponent = method.icon
                                return (
                                  <SelectItem 
                                    key={method.value} 
                                    value={method.value}
                                    className="p-4 cursor-pointer"
                                  >
                                    <div className="flex items-start gap-3 w-full">
                                      <IconComponent className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{method.label}</span>
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">{method.processingTime}</span>
                                          </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{method.description}</p>
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            <span>Fee: {method.feeLevel}</span>
                                          </div>
                                          {method.minimumAmount && (
                                            <span className="text-muted-foreground">
                                              Min: {method.minimumAmount}
                                            </span>
                                          )}
                                          <span className="text-muted-foreground">
                                            Max: {method.maximumAmount}
                                          </span>
                                        </div>
                                        {method.note && (
                                          <p className="text-xs text-primary/80 italic">{method.note}</p>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {paymentMethods.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No USD payment methods available
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
                          Customer Wallet Address
                          {isLoadingDepositAddresses && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
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
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value}
                                  data-testid={`option-wallet-${option.asset.toLowerCase()}`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{option.asset} Address</span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {option.fullAddress}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {depositAddressesError && (
                          <p className="text-sm text-red-500">
                            Error loading deposit addresses. Please try refreshing the page.
                          </p>
                        )}
                        {depositAddressOptions.length === 0 && !isLoadingDepositAddresses && !depositAddressesError && (
                          <p className="text-sm text-muted-foreground">
                            No deposit addresses available. Please complete KYB verification first.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isCreatingPaymentLink || !quoteDetails}
                    className="flex-1"
                    data-testid="button-create-payment-link"
                  >
                    {isCreatingPaymentLink && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Payment Link
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

        {/* Real-time Quote Display */}
        {isLoadingQuote && (
          <Card>
            <CardContent className="flex items-center justify-center py-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Getting real-time pricing...</span>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {/* Display detailed fee breakdown from real Transak API */}
                  {quoteDetails.feeBreakdown && quoteDetails.feeBreakdown.length > 0 ? (
                    quoteDetails.feeBreakdown.map((fee: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{fee.name}:</span>
                        <span className="font-mono">{fee.value} {quoteDetails.fiatCurrency}</span>
                      </div>
                    ))
                  ) : (
                    // Fallback if no detailed breakdown available
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Fee:</span>
                      <span className="font-mono">{quoteDetails.totalFee} {quoteDetails.fiatCurrency}</span>
                    </div>
                  )}
                  
                  {/* Show market rate and slippage info */}
                  {quoteDetails.marketRate && quoteDetails.slippage && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Market Rate:</span>
                        <span className="font-mono text-xs">
                          1 {quoteDetails.cryptoCurrency} = {quoteDetails.marketRate} {quoteDetails.fiatCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Slippage:</span>
                        <span className="font-mono">{(quoteDetails.slippage * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  )}
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

      {/* USD Payment Methods Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>USD Payment Methods Available</CardTitle>
          <CardDescription>
            Compare processing times, fees, and limits for US customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usdPaymentMethods.map((method) => {
              const IconComponent = method.icon
              return (
                <Card key={method.value} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className="font-semibold">{method.label}</h4>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Processing:</span>
                            <Badge variant="outline" className="text-xs">
                              {method.processingTime}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Fees:</span>
                            <span className="font-medium">{method.feeLevel}</span>
                          </div>
                          
                          {method.minimumAmount && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Minimum:</span>
                              <span className="font-medium">{method.minimumAmount}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Daily Limit:</span>
                            <span className="font-medium">{method.dailyLimit}</span>
                          </div>
                        </div>
                        
                        {method.note && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-primary/80">
                            {method.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> All methods support USD payments for US customers. Processing times may vary based on bank processing schedules and weekends. Higher value transactions may require additional verification.
            </p>
          </div>
        </CardContent>
      </Card>

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