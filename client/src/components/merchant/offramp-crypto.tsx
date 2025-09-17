import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpFromLine, ExternalLink, Loader2, CheckCircle, AlertTriangle, Banknote, Building, Copy, Wallet, DollarSign, Clock, CreditCard } from "lucide-react"
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

export function OfframpCrypto() {
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState<'transak' | 'cybrid'>('transak')
  const [isCreatingOfframp, setIsCreatingOfframp] = useState(false)
  const [payoutDetails, setPayoutDetails] = useState<any>(null)
  const [paymentLink, setPaymentLink] = useState("")
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [quoteDetails, setQuoteDetails] = useState<any>(null)
  const [walletValidation, setWalletValidation] = useState<{
    isValid: boolean | null;
    isValidating: boolean;
    error: string | null;
  }>({ isValid: null, isValidating: false, error: null })

  // Simple crypto options for Cybrid (fallback)
  const supportedCrypto = [
    { value: "USDC", label: "USDC - USD Coin" },
    { value: "USDT", label: "USDT - Tether" },
    { value: "ETH", label: "ETH - Ethereum" },
    { value: "BTC", label: "BTC - Bitcoin" }
  ]

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

  // Fetch real crypto currencies from Transak API
  const { data: cryptoCurrenciesData, isLoading: isLoadingCrypto, error: cryptoError } = useQuery({
    queryKey: ['/api/public/transak/crypto-currencies'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch fiat currencies with payment methods using the exact user-specified fetch
  const { data: fiatCurrenciesData, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['/api/public/transak/fiat-currencies'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const transakForm = useForm({
    defaultValues: {
      cryptoAmount: "",
      cryptoNetworkCombined: "USDC-ethereum", // Combined format: crypto-network
      fiatCurrency: "USD",
      payoutMethod: "credit_debit_card", // Default to Visa debit card (most widely supported)
      walletAddress: "",
      customerEmail: ""
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

  // Create combined crypto-network options for dropdown with real API data
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
        // Extract crypto info and network from real API response
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

      // Remove duplicates by value
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

  // Mock bank accounts - should come from Cybrid API
  const bankAccounts = [
    { id: "bank_001", name: "Chase Business Checking", accountType: "checking", last4: "1234" },
    { id: "bank_002", name: "Wells Fargo Savings", accountType: "savings", last4: "5678" }
  ]

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

  // Enhanced payout methods based on Transak documentation and selected fiat currency
  const transakPayoutMethods = (() => {
    const selectedFiat = transakForm.watch('fiatCurrency') || 'USD';
    
    // Define payout methods by currency based on Transak documentation
    const payoutMethodsByFiat: { [key: string]: any[] } = {
      USD: [
        { 
          value: "credit_debit_card", 
          label: "Visa Debit Card", 
          shortLabel: "Visa Debit",
          processingTime: "Real-time", 
          description: "Instant payout to your Visa debit card",
          coverage: "117 countries",
          note: "Only debit cards supported"
        },
        { 
          value: "mastercard_debit", 
          label: "Mastercard Debit Card", 
          shortLabel: "Mastercard Debit",
          processingTime: "Real-time", 
          description: "Instant payout to Mastercard debit card",
          coverage: "EEA & UK",
          note: "Available in EEA & UK"
        },
        { 
          value: "ach_bank_transfer", 
          label: "ACH Bank Transfer", 
          shortLabel: "ACH Transfer",
          processingTime: "1-2 business days", 
          description: "Direct transfer to your US bank account",
          coverage: "US banks"
        },
        { 
          value: "wire_transfer", 
          label: "Wire Transfer", 
          shortLabel: "Wire Transfer",
          processingTime: "Same business day", 
          description: "Fast wire transfer to your bank",
          coverage: "US banks"
        }
      ],
      EUR: [
        { 
          value: "sepa_bank_transfer", 
          label: "SEPA Bank Transfer", 
          shortLabel: "SEPA Transfer",
          processingTime: "1-2 business days", 
          description: "Transfer to European bank account",
          coverage: "40 EEA countries"
        },
        { 
          value: "credit_debit_card", 
          label: "Visa Debit Card", 
          shortLabel: "Visa Debit",
          processingTime: "Real-time", 
          description: "Instant payout to your Visa debit card",
          coverage: "Europe"
        },
        { 
          value: "mastercard_debit", 
          label: "Mastercard Debit Card", 
          shortLabel: "Mastercard Debit",
          processingTime: "Real-time", 
          description: "Instant payout to Mastercard debit card",
          coverage: "EEA & UK"
        }
      ],
      GBP: [
        { 
          value: "faster_payments", 
          label: "Faster Payments", 
          shortLabel: "Faster Payments",
          processingTime: "Real-time", 
          description: "Instant transfer to UK bank accounts",
          coverage: "UK banks"
        },
        { 
          value: "credit_debit_card", 
          label: "Visa Debit Card", 
          shortLabel: "Visa Debit",
          processingTime: "Real-time", 
          description: "Instant payout to your Visa debit card",
          coverage: "UK"
        }
      ],
      CAD: [
        { 
          value: "bank_transfer", 
          label: "Bank Transfer", 
          shortLabel: "Bank Transfer",
          processingTime: "1-2 business days", 
          description: "Transfer to your Canadian bank account",
          coverage: "Canadian banks"
        }
      ],
      AUD: [
        { 
          value: "bank_transfer", 
          label: "Bank Transfer", 
          shortLabel: "Bank Transfer",
          processingTime: "1-2 business days", 
          description: "Transfer to your Australian bank account",
          coverage: "Australian banks"
        }
      ]
    };

    // Try to get methods from API first
    if (fiatCurrenciesData && (fiatCurrenciesData as any)?.response) {
      const currencies = (fiatCurrenciesData as any).response;
      const selectedCurrency = currencies.find((curr: any) => curr.symbol === selectedFiat);
      
      if (selectedCurrency && selectedCurrency.supportedPaymentMethods) {
        const apiMethods = selectedCurrency.supportedPaymentMethods
          .filter((method: any) => method.isPayOutAllowed === true)
          .map((method: any) => ({
            value: method.id,
            label: method.name || method.id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            processingTime: method.processingTime || "Processing time varies",
            description: method.description || "Bank payout method",
            minAmount: method.minAmountForPayOut,
            maxAmount: method.maxAmountForPayOut,
            icon: method.icon || "💰"
          }));
        
        if (apiMethods.length > 0) {
          return apiMethods;
        }
      }
    }

    // Get methods for selected currency, fallback to USD methods
    return payoutMethodsByFiat[selectedFiat] || payoutMethodsByFiat.USD;
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

  // Real-time quote fetching function for offramp (without creating payment link)
  const fetchOfframpQuote = async (formData: any) => {
    if (!formData.cryptoAmount || !formData.cryptoNetworkCombined || !formData.fiatCurrency || !formData.payoutMethod) {
      setQuoteDetails(null)
      return
    }

    if (!merchantStatus.kybCompleted || !merchantStatus.custodianAccountCreated) {
      return
    }

    setIsLoadingQuote(true)
    console.log('Fetching real-time offramp quote with data:', formData)

    try {
      const response = await apiRequest('POST', '/api/merchant/transak/offramp-pricing-quote', {
        cryptoAmount: formData.cryptoAmount,
        cryptoNetworkCombined: formData.cryptoNetworkCombined,
        fiatCurrency: formData.fiatCurrency,
        payoutMethod: formData.payoutMethod,
        walletAddress: formData.walletAddress
      })

      if (!response.ok) {
        throw new Error('Failed to get offramp pricing quote from server')
      }

      const transakQuote = await response.json()
      console.log('Received real-time offramp quote:', transakQuote)

      const [cryptoCurrency, network] = formData.cryptoNetworkCombined.split('-')
      
      const formattedQuote = {
        ...transakQuote,
        cryptoCurrency: cryptoCurrency,
        network: network
      }

      setQuoteDetails(formattedQuote)
    } catch (error) {
      console.error('Error fetching real-time offramp quote:', error)
      setQuoteDetails(null)
    } finally {
      setIsLoadingQuote(false)
    }
  }

  // Watch form changes and trigger real-time quote updates with debouncing
  const formValues = transakForm.watch()
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchOfframpQuote(formValues)
    }, 500) // 500ms debounce

    return () => clearTimeout(debounceTimer)
  }, [formValues.cryptoAmount, formValues.cryptoNetworkCombined, formValues.fiatCurrency, formValues.payoutMethod, merchantStatus.kybCompleted, merchantStatus.custodianAccountCreated])

  const cybridPayoutMethods = [
    { value: "ach", label: "ACH Transfer" },
    { value: "wire", label: "Wire Transfer" }
  ]

  // Function to create Transak offramp session with fresh quote
  const handleTransakOfframp = async (data: any) => {
    if (!merchantStatus.kybCompleted) {
      toast({
        title: "KYB Required",
        description: "Complete your KYB verification before creating offramp sessions.",
        variant: "destructive"
      })
      return
    }

    if (!merchantStatus.custodianAccountCreated) {
      toast({
        title: "Custodian Account Required", 
        description: "Create your custodian account before accessing offramp functionality.",
        variant: "destructive"
      })
      return
    }

    // Check if current form values match the displayed quote
    if (!quoteDetails || 
        isLoadingQuote || 
        !data.cryptoAmount || 
        !data.cryptoNetworkCombined || 
        !data.fiatCurrency || 
        !data.payoutMethod ||
        !data.walletAddress) {
      toast({
        title: "Please Wait",
        description: "Quote is updating or missing required fields. Please ensure all fields are filled.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingOfframp(true)
    console.log('Creating Transak offramp session with fresh quote verification')

    try {
      // Fetch fresh quote with current form values to prevent stale data
      const quoteResponse = await apiRequest('POST', '/api/merchant/transak/offramp-pricing-quote', {
        cryptoAmount: data.cryptoAmount,
        cryptoNetworkCombined: data.cryptoNetworkCombined,
        fiatCurrency: data.fiatCurrency,
        payoutMethod: data.payoutMethod,
        walletAddress: data.walletAddress
      })

      if (!quoteResponse.ok) {
        throw new Error('Failed to get fresh offramp pricing quote')
      }

      const freshQuote = await quoteResponse.json()
      const [cryptoCurrency, network] = data.cryptoNetworkCombined.split('-')
      
      const formattedQuote = {
        ...freshQuote,
        cryptoCurrency: cryptoCurrency,
        network: network
      }

      // Update the displayed quote with fresh data
      setPayoutDetails(formattedQuote)

      // Create Transak offramp session using the fresh quote data
      const sessionResponse = await apiRequest('POST', '/api/merchant/transak/create-offramp-session', {
        quoteData: {
          cryptoAmount: formattedQuote.cryptoAmount, // Fixed: send cryptoAmount instead of fiatAmount
          cryptoCurrency: formattedQuote.cryptoCurrency,
          fiatCurrency: formattedQuote.fiatCurrency,
          network: formattedQuote.network,
          paymentMethod: formattedQuote.payoutMethod,
          isBuyOrSell: 'SELL'
        },
        walletAddress: data.walletAddress,
        customerEmail: data.customerEmail || '',
        referrerDomain: window.location.hostname,
        redirectURL: `${window.location.origin}/transaction-complete`,
        themeColor: "1f4a8c"
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create Transak offramp session')
      }

      const sessionData = await sessionResponse.json()
      
      // Check if request was successful
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Offramp session creation failed')
      }
      
      // Extract URLs from response format - use masked payment link
      const widgetUrl = sessionData.widgetUrl
      
      if (!widgetUrl) {
        console.error('Transak offramp session response:', sessionData)
        throw new Error('No widget URL received from Transak offramp session')
      }

      setPaymentLink(widgetUrl)
      
      toast({
        title: "Offramp Session Created",
        description: "Click the link to complete your crypto offramp via Transak.",
      })
      
    } catch (error) {
      console.error('Error creating Transak offramp session:', error)
      
      // Enhanced error handling
      let errorMessage = "Failed to create offramp session. Please try again."
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
          errorMessage = "Offramp session was created but no payment link was received. Please try again."
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCreatingOfframp(false)
    }
  }

  const handleCybridPayout = async (data: any) => {
    setIsCreatingOfframp(true)
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
      setIsCreatingOfframp(false)
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
              <CardContent className="space-y-4">
                {/* Enhanced Payout Options Info */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 dark:text-blue-400 text-sm">ℹ️</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Enhanced Payout Options</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Multiple payout methods available based on your currency selection:
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                        <div>• <strong>Debit Cards:</strong> Real-time payouts (Visa: 117 countries, Mastercard: EEA/UK)</div>
                        <div>• <strong>Bank Transfers:</strong> SEPA (EUR), Faster Payments (GBP), ACH/Wire (USD)</div>
                        <div>• <strong>Note:</strong> Only debit cards supported - credit cards not available for payouts</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Form {...transakForm}>
                  <form onSubmit={transakForm.handleSubmit(handleTransakOfframp)} className="space-y-4">
                    <div className="space-y-4">
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
                        name="cryptoNetworkCombined"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cryptocurrency & Network</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value} 
                                onValueChange={(value) => {
                                  field.onChange(value)
                                  // Trigger wallet validation when crypto/network changes
                                  const currentWallet = transakForm.getValues('walletAddress')
                                  if (currentWallet) {
                                    validateWalletAddress(currentWallet, value)
                                  }
                                }}
                              >
                                <SelectTrigger data-testid="select-transak-crypto-network">
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
                        control={transakForm.control}
                        name="walletAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Wallet Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="0x1234...abcd or bc1q..."
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    // Trigger validation on input change
                                    const cryptoNetworkCombined = transakForm.getValues('cryptoNetworkCombined')
                                    if (e.target.value && cryptoNetworkCombined) {
                                      validateWalletAddress(e.target.value, cryptoNetworkCombined)
                                    }
                                  }}
                                  data-testid="input-wallet-address"
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
                              <p className="text-sm text-red-600">{walletValidation.error}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
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
                                    {transakPayoutMethods.map((method: any) => (
                                      <SelectItem key={method.value} value={method.value}>
                                        {method.shortLabel || method.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Payout Method Details */}
                        {(() => {
                          const selectedPayoutMethod = transakForm.watch('payoutMethod');
                          const selectedMethod = transakPayoutMethods.find(method => method.value === selectedPayoutMethod);
                          
                          if (!selectedMethod) return null;
                          
                          return (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                  <span className="font-medium text-sm">{selectedMethod.label}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {selectedMethod.processingTime}
                                  </Badge>
                                  {selectedMethod.coverage && (
                                    <Badge variant="secondary" className="text-xs">
                                      {selectedMethod.coverage}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {selectedMethod.description}
                              </p>
                              {selectedMethod.note && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  {selectedMethod.note}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <FormField
                        control={transakForm.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email (Optional)</FormLabel>
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
                    </div>

                    {/* Real-time Quote Display */}
                    {isLoadingQuote && (
                      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Fetching real-time quote...</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {quoteDetails && !isLoadingQuote && (
                      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Real-time Quote
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Selling:</span>
                              <span className="font-mono">{quoteDetails.cryptoAmount} {quoteDetails.cryptoCurrency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Receiving:</span>
                              <span className="font-mono font-medium text-green-600">{quoteDetails.fiatAmount} {quoteDetails.fiatCurrency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate:</span>
                              <span className="font-mono">{quoteDetails.conversionRate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Fee:</span>
                              <span className="font-mono text-red-600">{quoteDetails.totalFee} {quoteDetails.fiatCurrency}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Quote valid for 15 minutes
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button 
                      type="submit" 
                      disabled={isCreatingOfframp || isLoadingQuote || !quoteDetails || walletValidation.isValid !== true}
                      className="w-full"
                      data-testid="button-create-transak-offramp"
                    >
                      {isCreatingOfframp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Transak Offramp Session
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {payoutDetails && paymentLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Transak Offramp Session Ready
                  </CardTitle>
                  <CardDescription>
                    Click the link below to complete your crypto offramp via Transak
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
                        <span className="text-muted-foreground">Total Fee:</span>
                        <span className="font-mono text-red-600">{payoutDetails.totalFee} {payoutDetails.fiatCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Network:</span>
                        <span className="text-xs">{payoutDetails.network}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={() => window.open(paymentLink, '_blank')} 
                      className="w-full"
                      data-testid="button-open-transak-offramp-link"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Offramp via Transak
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={copyPaymentLink} 
                        className="flex-1"
                        data-testid="button-copy-offramp-link"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button variant="outline" onClick={resetForms} className="flex-1">
                        Create Another
                      </Button>
                    </div>
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
                                  {supportedCrypto.map((crypto: any) => (
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
                      disabled={isCreatingOfframp}
                      className="w-full"
                      data-testid="button-create-cybrid-payout"
                    >
                      {isCreatingOfframp && activeProvider === 'cybrid' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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