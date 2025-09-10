import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DollarSign, TrendingUp, Users, Wallet, ExternalLink, CheckCircle, Clock, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function MerchantDashboard() {
  const { toast } = useToast()

  // TODO: remove mock functionality - replace with real merchant data
  const revenueData = [
    { date: '2024-01-15', revenue: 1250, transactions: 12 },
    { date: '2024-01-16', revenue: 2100, transactions: 18 },
    { date: '2024-01-17', revenue: 1800, transactions: 15 },
    { date: '2024-01-18', revenue: 2800, transactions: 22 },
    { date: '2024-01-19', revenue: 3200, transactions: 28 },
    { date: '2024-01-20', revenue: 2400, transactions: 20 },
    { date: '2024-01-21', revenue: 3800, transactions: 32 },
  ]

  const accountBalances = [
    { account: 'USDC Trading', balance: '15,234.56', change: '+2.3%', address: '0x742d35Cc6Bf0532B...' },
    { account: 'USDT Trading', balance: '8,921.45', change: '+1.8%', address: '0x742d35Cc6Bf0532B...' },
    { account: 'Fiat Account', balance: '12,450.00', change: '+5.2%', address: 'USD-ACCOUNT-001' },
  ]

  const recentOrders = [
    { id: 'ord_001', category: 'Crypto Received', amount: '$245.00', crypto: '245 USDC', customer: 'john@example.com', status: 'completed', time: '2 minutes ago' },
    { id: 'ord_002', category: 'Crypto Received', amount: '$1,200.00', crypto: '1,200 USDC', customer: 'sarah@company.com', status: 'completed', time: '15 minutes ago' },
    { id: 'ord_003', category: 'Payouts', amount: '$500.00', crypto: '500 USDT', method: 'ACH Transfer', status: 'processing', time: '1 hour ago' },
    { id: 'ord_004', category: 'Crypto Received', amount: '$75.50', crypto: '75.5 USDC', customer: 'mike@startup.io', status: 'completed', time: '2 hours ago' },
    { id: 'ord_005', category: 'Payouts', amount: '$850.00', crypto: '850 USDC', method: 'Wire Transfer', status: 'completed', time: '3 hours ago' },
  ]

  const kybProgress = {
    completed: 3,
    total: 4,
    steps: [
      { name: 'Business Information', status: 'completed' },
      { name: 'Document Upload', status: 'completed' },
      { name: 'Director Verification', status: 'completed' },
      { name: 'Final Review', status: 'pending' }
    ]
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to your clipboard.`,
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: "default" as const, icon: CheckCircle },
      pending: { variant: "secondary" as const, icon: Clock },
      processing: { variant: "secondary" as const, icon: Clock },
      failed: { variant: "destructive" as const, icon: Clock }
    }
    const config = variants[status as keyof typeof variants] || variants.completed
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Merchant Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your payment processing, account balances, and integration status
        </p>
      </div>

      {/* KYB Status Alert */}
      {kybProgress.completed < kybProgress.total && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-5 w-5" />
              Complete Your KYB Verification
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Finish your Know Your Business verification to unlock full platform features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={(kybProgress.completed / kybProgress.total) * 100} className="w-full" />
              <div className="flex justify-between text-sm">
                <span>{kybProgress.completed} of {kybProgress.total} steps completed</span>
                <Button variant="outline" size="sm" data-testid="button-continue-kyb">
                  Continue KYB
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-revenue">$18,650</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-transaction-count">147</div>
            <p className="text-xs text-muted-foreground">
              +8 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">97.8%</div>
            <p className="text-xs text-muted-foreground">
              Above industry average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-transaction">$127</div>
            <p className="text-xs text-muted-foreground">
              +3.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue and transaction volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Transactions'
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Account Balances</CardTitle>
              <CardDescription>Your crypto and fiat account balances</CardDescription>
            </div>
            <Button variant="outline" size="sm" data-testid="button-view-accounts">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountBalances.map((account, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`balance-${index}`}>
                  <div className="space-y-1">
                    <p className="font-medium">{account.account}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                        {account.address}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(account.address, 'Address')}
                        data-testid={`button-copy-address-${index}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${account.balance}</p>
                    <p className="text-sm text-green-600">{account.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest crypto received and payout activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" data-testid="button-view-all-orders">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`order-${order.id}`}>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={order.category === 'Crypto Received' ? 'default' : 'secondary'} className="text-xs">
                      {order.category}
                    </Badge>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.category === 'Crypto Received' 
                      ? `From: ${order.customer}` 
                      : `Method: ${order.method}`
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">{order.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{order.amount}</p>
                  <p className="text-sm text-muted-foreground">{order.crypto}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}