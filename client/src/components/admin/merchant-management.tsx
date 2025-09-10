import { useState } from "react"
import { Search, Filter, Plus, Edit, CheckCircle, XCircle, Clock, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function MerchantManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // TODO: remove mock functionality - replace with real merchant data
  const mockMerchants = [
    {
      id: "merch_001",
      name: "TechCorp Inc",
      email: "admin@techcorp.com",
      status: "approved",
      kybStatus: "verified",
      dateOnboarded: "2024-01-15",
      integrations: ["transak", "cybrid"],
      volume: "$125,000"
    },
    {
      id: "merch_002", 
      name: "Digital Goods Ltd",
      email: "finance@digitalgoods.com",
      status: "pending",
      kybStatus: "review",
      dateOnboarded: "2024-01-20",
      integrations: ["transak"],
      volume: "$45,000"
    },
    {
      id: "merch_003",
      name: "CryptoShop",
      email: "payments@cryptoshop.io",
      status: "approved",
      kybStatus: "verified", 
      dateOnboarded: "2024-01-10",
      integrations: ["transak", "cybrid"],
      volume: "$285,000"
    },
    {
      id: "merch_004",
      name: "GameFi Platform",
      email: "business@gamefi.game",
      status: "rejected",
      kybStatus: "failed",
      dateOnboarded: "2024-01-22",
      integrations: [],
      volume: "$0"
    }
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: { variant: "default" as const, icon: CheckCircle, text: "Approved" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" }
    }
    const config = variants[status as keyof typeof variants]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getKybBadge = (kybStatus: string) => {
    const variants = {
      verified: { variant: "default" as const, text: "Verified" },
      review: { variant: "secondary" as const, text: "In Review" },
      failed: { variant: "destructive" as const, text: "Failed" }
    }
    const config = variants[kybStatus as keyof typeof variants]
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const filteredMerchants = mockMerchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleMerchantAction = (action: string, merchantId: string) => {
    console.log(`${action} triggered for merchant: ${merchantId}`)
    // TODO: Implement real merchant actions
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merchant Management</h1>
          <p className="text-muted-foreground">
            Manage merchant accounts, KYB status, and integrations
          </p>
        </div>
        <Button data-testid="button-add-merchant">
          <Plus className="h-4 w-4 mr-2" />
          Add Merchant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-merchants">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-merchants">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-merchants">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-volume">$455K</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Directory</CardTitle>
          <CardDescription>
            Search and filter merchants by status, name, or email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search merchants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-merchants"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Merchants Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYB</TableHead>
                  <TableHead>Integrations</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{merchant.name}</div>
                        <div className="text-sm text-muted-foreground">{merchant.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(merchant.status)}
                    </TableCell>
                    <TableCell>
                      {getKybBadge(merchant.kybStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {merchant.integrations.map((integration) => (
                          <Badge key={integration} variant="outline" className="text-xs">
                            {integration}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{merchant.volume}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(merchant.dateOnboarded).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${merchant.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleMerchantAction('view', merchant.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMerchantAction('edit', merchant.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Merchant
                          </DropdownMenuItem>
                          {merchant.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleMerchantAction('approve', merchant.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMerchantAction('reject', merchant.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}