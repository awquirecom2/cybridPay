import { useState } from "react"
import { Webhook, Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Clock, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export function WebhookManagement() {
  const { toast } = useToast()
  const [selectedMerchant, setSelectedMerchant] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // TODO: remove mock functionality - replace with real webhook data
  const webhookEvents = [
    {
      id: "evt_001",
      merchant: "TechCorp Inc",
      eventType: "payment.completed",
      url: "https://techcorp.com/webhooks/ruupay",
      status: "success",
      attempts: 1,
      timestamp: "2024-01-21 14:30:22",
      responseCode: 200,
      responseTime: "145ms"
    },
    {
      id: "evt_002",
      merchant: "Digital Goods Ltd",
      eventType: "payment.failed",
      url: "https://digitalgoods.com/api/webhooks",
      status: "failed",
      attempts: 3,
      timestamp: "2024-01-21 14:25:15",
      responseCode: 500,
      responseTime: "timeout"
    },
    {
      id: "evt_003",
      merchant: "CryptoShop",
      eventType: "kyb.approved",
      url: "https://cryptoshop.io/webhooks/status",
      status: "success",
      attempts: 1,
      timestamp: "2024-01-21 13:45:10",
      responseCode: 200,
      responseTime: "89ms"
    },
    {
      id: "evt_004",
      merchant: "GameFi Platform",
      eventType: "payment.completed",
      url: "https://gamefi.game/api/payments",
      status: "pending",
      attempts: 1,
      timestamp: "2024-01-21 14:32:01",
      responseCode: null,
      responseTime: null
    }
  ]

  const webhookConfig = [
    {
      merchant: "TechCorp Inc",
      endpoint: "https://techcorp.com/webhooks/ruupay",
      enabled: true,
      events: ["payment.completed", "payment.failed", "kyb.approved"],
      secret: "whsec_1234567890abcdef",
      retryCount: 3
    },
    {
      merchant: "Digital Goods Ltd", 
      endpoint: "https://digitalgoods.com/api/webhooks",
      enabled: true,
      events: ["payment.completed", "payment.failed"],
      secret: "whsec_abcdef1234567890",
      retryCount: 3
    },
    {
      merchant: "CryptoShop",
      endpoint: "https://cryptoshop.io/webhooks/status",
      enabled: false,
      events: ["payment.completed", "kyb.approved"],
      secret: "whsec_fedcba0987654321",
      retryCount: 2
    }
  ]

  const eventTypes = [
    { name: "payment.completed", description: "Payment successfully processed" },
    { name: "payment.failed", description: "Payment processing failed" },
    { name: "payment.pending", description: "Payment is being processed" },
    { name: "kyb.submitted", description: "KYB documents submitted" },
    { name: "kyb.approved", description: "KYB verification approved" },
    { name: "kyb.rejected", description: "KYB verification rejected" },
    { name: "merchant.approved", description: "Merchant account approved" },
    { name: "merchant.suspended", description: "Merchant account suspended" }
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      success: { variant: "default" as const, icon: CheckCircle, text: "Success" },
      failed: { variant: "destructive" as const, icon: AlertTriangle, text: "Failed" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" }
    }
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const handleRetryWebhook = (eventId: string) => {
    console.log(`Retrying webhook: ${eventId}`)
    toast({
      title: "Webhook retry initiated",
      description: "The webhook event has been queued for retry.",
    })
  }

  const handleToggleWebhook = (merchant: string, enabled: boolean) => {
    console.log(`Toggling webhook for ${merchant}:`, enabled)
    toast({
      title: enabled ? "Webhook enabled" : "Webhook disabled",
      description: `Webhook delivery ${enabled ? 'enabled' : 'disabled'} for ${merchant}.`,
    })
  }

  const filteredEvents = webhookEvents.filter(event => {
    const matchesMerchant = selectedMerchant === "all" || event.merchant === selectedMerchant
    const matchesStatus = filterStatus === "all" || event.status === filterStatus
    return matchesMerchant && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage webhook deliveries for real-time event notifications
        </p>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="tab-webhook-events">Webhook Events</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-webhook-config">Configuration</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-webhook-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-events">4</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">75%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-failed-events">1</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-response-time">117ms</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label>Filter by Merchant</Label>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                    <SelectTrigger data-testid="select-merchant-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Merchants</SelectItem>
                      <SelectItem value="TechCorp Inc">TechCorp Inc</SelectItem>
                      <SelectItem value="Digital Goods Ltd">Digital Goods Ltd</SelectItem>
                      <SelectItem value="CryptoShop">CryptoShop</SelectItem>
                      <SelectItem value="GameFi Platform">GameFi Platform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Label>Filter by Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                Recent webhook deliveries and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id} data-testid={`row-webhook-${event.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium font-mono text-sm">{event.eventType}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {event.url}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{event.merchant}</TableCell>
                        <TableCell>
                          {getStatusBadge(event.status)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{event.attempts}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {event.responseCode && (
                              <div className="font-mono">{event.responseCode}</div>
                            )}
                            {event.responseTime && (
                              <div className="text-muted-foreground">{event.responseTime}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.timestamp}
                        </TableCell>
                        <TableCell>
                          {event.status === 'failed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRetryWebhook(event.id)}
                              data-testid={`button-retry-${event.id}`}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhook endpoints and event subscriptions per merchant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhookConfig.map((config, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{config.merchant}</CardTitle>
                        <Switch 
                          checked={config.enabled}
                          onCheckedChange={(checked) => handleToggleWebhook(config.merchant, checked)}
                          data-testid={`switch-webhook-${index}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Webhook Endpoint</Label>
                        <Input 
                          value={config.endpoint} 
                          className="font-mono text-sm"
                          data-testid={`input-endpoint-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label>Subscribed Events</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Webhook Secret</Label>
                          <Input 
                            value={config.secret}
                            type="password"
                            className="font-mono text-sm"
                            data-testid={`input-secret-${index}`}
                          />
                        </div>
                        <div>
                          <Label>Retry Count</Label>
                          <Input 
                            value={config.retryCount}
                            type="number"
                            min="0"
                            max="5"
                            data-testid={`input-retry-${index}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Global Webhook Settings
              </CardTitle>
              <CardDescription>
                Configure platform-wide webhook behavior and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Retry Policy</h3>
                  <div className="space-y-2">
                    <Label>Default Retry Count</Label>
                    <Input type="number" defaultValue="3" min="0" max="10" data-testid="input-default-retry" />
                  </div>
                  <div className="space-y-2">
                    <Label>Retry Delay (seconds)</Label>
                    <Input type="number" defaultValue="30" min="1" max="3600" data-testid="input-retry-delay" />
                  </div>
                  <div className="space-y-2">
                    <Label>Timeout (seconds)</Label>
                    <Input type="number" defaultValue="30" min="5" max="120" data-testid="input-timeout" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Event Types</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eventTypes.map((eventType) => (
                      <div key={eventType.name} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-mono text-sm">{eventType.name}</div>
                          <div className="text-xs text-muted-foreground">{eventType.description}</div>
                        </div>
                        <Switch defaultChecked data-testid={`switch-event-${eventType.name}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button data-testid="button-save-webhook-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}