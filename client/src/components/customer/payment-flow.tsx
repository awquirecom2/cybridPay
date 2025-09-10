import { useState } from "react"
import { CreditCard, Wallet, ArrowRight, CheckCircle, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

interface PaymentFlowProps {
  merchantId: string
}

export function PaymentFlow({ merchantId }: PaymentFlowProps) {
  const [step, setStep] = useState<'input' | 'widget' | 'processing' | 'complete'>('input')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [targetCrypto, setTargetCrypto] = useState('USDC')
  const [paymentProgress, setPaymentProgress] = useState(0)

  // TODO: remove mock functionality - replace with real merchant data and Transak integration
  const mockMerchant = {
    name: 'Demo Merchant Store',
    logo: '',
    limits: { min: 10, max: 5000 },
    supportedCrypto: ['USDC', 'USDT', 'ETH', 'BTC']
  }

  const mockTransaction = {
    id: 'tx_demo_12345',
    hash: '0x742d35Cc6Bf05322B38d82E73...', 
    fiatAmount: amount,
    cryptoAmount: currency === 'USD' ? parseFloat(amount) : parseFloat(amount) * 0.85,
    fees: {
      platform: parseFloat(amount) * 0.025,
      network: 2.50
    }
  }

  const exchangeRates = {
    'USDC': 1.00,
    'USDT': 1.00, 
    'ETH': 2650.00,
    'BTC': 45000.00
  }

  const calculateCrypto = (fiatAmount: string, crypto: string) => {
    const fiat = parseFloat(fiatAmount) || 0
    const rate = exchangeRates[crypto as keyof typeof exchangeRates]
    return crypto === 'USDC' || crypto === 'USDT' ? fiat : fiat / rate
  }

  const handlePaymentInitiation = () => {
    if (!amount || parseFloat(amount) < mockMerchant.limits.min || parseFloat(amount) > mockMerchant.limits.max) {
      return
    }
    
    console.log('Payment initiated', { amount, currency, targetCrypto, merchantId })
    setStep('widget')
    
    // Simulate widget loading and payment processing
    setTimeout(() => {
      setStep('processing')
      const progressInterval = setInterval(() => {
        setPaymentProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setStep('complete')
            return 100
          }
          return prev + 20
        })
      }, 800)
    }, 2000)
  }

  const renderPaymentInput = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-lg bg-primary/10 w-fit">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Pay with Crypto</CardTitle>
        <CardDescription>
          Powered by {mockMerchant.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount to Pay</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-3 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                data-testid="input-payment-amount"
              />
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-20" data-testid="select-fiat-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Min: ${mockMerchant.limits.min} • Max: ${mockMerchant.limits.max}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Receive Cryptocurrency</label>
          <Select value={targetCrypto} onValueChange={setTargetCrypto}>
            <SelectTrigger data-testid="select-target-crypto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockMerchant.supportedCrypto.map((crypto) => (
                <SelectItem key={crypto} value={crypto}>{crypto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {amount && (
            <div className="text-sm bg-muted p-2 rounded">
              You'll receive: <span className="font-mono font-bold">
                {calculateCrypto(amount, targetCrypto).toFixed(targetCrypto === 'BTC' ? 6 : 2)} {targetCrypto}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button 
            onClick={handlePaymentInitiation}
            disabled={!amount || parseFloat(amount) < mockMerchant.limits.min || parseFloat(amount) > mockMerchant.limits.max}
            className="w-full"
            data-testid="button-initiate-payment"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Continue to Payment
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderTransakWidget = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Secure Payment</CardTitle>
        <CardDescription>
          Complete your payment through our secure partner
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Simulated Transak Widget */}
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <ExternalLink className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Transak Payment Widget</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to secure payment processor...
            </p>
            <Badge variant="outline" className="animate-pulse">
              Loading Payment Options
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
          <strong>Payment Summary:</strong>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-mono">${amount} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Target:</span>
              <span className="font-mono">{calculateCrypto(amount, targetCrypto).toFixed(targetCrypto === 'BTC' ? 6 : 2)} {targetCrypto}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderProcessing = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900 w-fit">
          <RefreshCw className="h-8 w-8 text-yellow-600 animate-spin" />
        </div>
        <CardTitle>Processing Payment</CardTitle>
        <CardDescription>
          Your transaction is being processed on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{paymentProgress}%</span>
          </div>
          <Progress value={paymentProgress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            Processing blockchain transaction...
          </p>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
          <div className="flex justify-between">
            <span>Transaction ID:</span>
            <code className="text-xs bg-background px-1 py-0.5 rounded" data-testid="text-transaction-id">
              {mockTransaction.id}
            </code>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-mono">${amount} {currency}</span>
          </div>
          <div className="flex justify-between">
            <span>Crypto Amount:</span>
            <span className="font-mono">{calculateCrypto(amount, targetCrypto).toFixed(targetCrypto === 'BTC' ? 6 : 2)} {targetCrypto}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderComplete = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900 w-fit">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-green-700 dark:text-green-300">Payment Successful!</CardTitle>
        <CardDescription>
          Your cryptocurrency purchase has been completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">Transaction Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Paid:</span>
              <span className="font-mono font-bold">${amount} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Received:</span>
              <span className="font-mono font-bold">{calculateCrypto(amount, targetCrypto).toFixed(targetCrypto === 'BTC' ? 6 : 2)} {targetCrypto}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee:</span>
              <span className="font-mono">${mockTransaction.fees.platform.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee:</span>
              <span className="font-mono">${mockTransaction.fees.network.toFixed(2)}</span>
            </div>
            <hr className="border-green-200 dark:border-green-800" />
            <div className="flex justify-between font-semibold">
              <span>Total Paid:</span>
              <span className="font-mono">${(parseFloat(amount) + mockTransaction.fees.platform + mockTransaction.fees.network).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span>Blockchain Hash:</span>
            <code className="text-xs bg-background px-2 py-1 rounded font-mono" data-testid="text-transaction-hash">
              {mockTransaction.hash}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open(`https://etherscan.io/tx/${mockTransaction.hash}`, '_blank')}
            data-testid="button-view-on-explorer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Block Explorer
          </Button>
          <Button 
            className="w-full"
            onClick={() => setStep('input')}
            data-testid="button-new-payment"
          >
            Make Another Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === 'input' && renderPaymentInput()}
        {step === 'widget' && renderTransakWidget()}
        {step === 'processing' && renderProcessing()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  )
}