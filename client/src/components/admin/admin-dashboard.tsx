import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export function AdminDashboard() {
  // TODO: remove mock functionality - replace with real analytics data
  const volumeData = [
    { month: 'Jan', volume: 125000, transactions: 1250 },
    { month: 'Feb', volume: 185000, transactions: 1850 },
    { month: 'Mar', volume: 245000, transactions: 2450 },
    { month: 'Apr', volume: 195000, transactions: 1950 },
    { month: 'May', volume: 285000, transactions: 2850 },
    { month: 'Jun', volume: 325000, transactions: 3250 },
  ]

  const merchantStatusData = [
    { name: 'Approved', value: 156, color: '#10B981' },
    { name: 'Pending', value: 23, color: '#F59E0B' },
    { name: 'Rejected', value: 8, color: '#EF4444' },
  ]

  const recentActivity = [
    { id: 1, type: 'merchant_approved', merchant: 'TechCorp Inc', time: '2 minutes ago' },
    { id: 2, type: 'webhook_failed', merchant: 'Digital Goods Ltd', time: '15 minutes ago' },
    { id: 3, type: 'kyb_submitted', merchant: 'GameFi Platform', time: '1 hour ago' },
    { id: 4, type: 'fee_updated', merchant: 'CryptoShop', time: '2 hours ago' },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'merchant_approved': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'webhook_failed': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'kyb_submitted': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'fee_updated': return <DollarSign className="h-4 w-4 text-blue-600" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const getActivityDescription = (type: string, merchant: string) => {
    switch (type) {
      case 'merchant_approved': return `${merchant} was approved and activated`
      case 'webhook_failed': return `Webhook delivery failed for ${merchant}`
      case 'kyb_submitted': return `${merchant} submitted KYB documents`
      case 'fee_updated': return `Fee configuration updated for ${merchant}`
      default: return `Activity for ${merchant}`
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform performance, merchant activity, and system health
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-merchants">187</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-volume">$325,000</div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">98.5%</div>
            <p className="text-xs text-muted-foreground">
              +0.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-active-alerts">3</div>
            <p className="text-xs text-muted-foreground">
              2 webhook failures, 1 KYB review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume Trend</CardTitle>
            <CardDescription>Monthly payment volume and transaction count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'volume' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                    name === 'volume' ? 'Volume' : 'Transactions'
                  ]}
                />
                <Line type="monotone" dataKey="volume" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="transactions" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Merchant Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all merchants</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={merchantStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {merchantStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {merchantStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-muted-foreground">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events and merchant actions</CardDescription>
          </div>
          <Button variant="outline" size="sm" data-testid="button-view-all-activity">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50" data-testid={`activity-${activity.id}`}>
                {getActivityIcon(activity.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {getActivityDescription(activity.type, activity.merchant)}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}