import { useState } from "react"
import { Search, Filter, Plus, Edit, CheckCircle, XCircle, Clock, MoreVertical, UserPlus, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function MerchantManagement() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newMerchant, setNewMerchant] = useState({
    name: "",
    email: "",
    businessType: "",
    website: ""
  })

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
    },
    {
      id: "merch_005",
      name: "E-commerce Plus",
      email: "admin@ecommerceplus.com",
      status: "deactivated",
      kybStatus: "verified",
      dateOnboarded: "2024-01-05",
      integrations: ["transak"],
      volume: "$75,000"
    }
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: { variant: "default" as const, icon: CheckCircle, text: "Approved" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" },
      deactivated: { variant: "outline" as const, icon: Ban, text: "Deactivated" }
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
    const merchant = mockMerchants.find(m => m.id === merchantId)
    if (!merchant) return

    switch (action) {
      case 'approve':
        toast({
          title: "Merchant Approved",
          description: `${merchant.name} has been approved and can now access the platform.`,
        })
        break
      case 'reject':
        toast({
          title: "Merchant Rejected",
          description: `${merchant.name} application has been rejected.`,
          variant: "destructive"
        })
        break
      case 'deactivate':
        toast({
          title: "Merchant Deactivated",
          description: `${merchant.name} has been deactivated and cannot process payments.`,
          variant: "destructive"
        })
        break
      case 'reactivate':
        toast({
          title: "Merchant Reactivated",
          description: `${merchant.name} has been reactivated and can process payments.`,
        })
        break
      default:
        console.log(`${action} triggered for merchant: ${merchantId}`)
    }
  }

  const handleCreateMerchant = async () => {
    if (!newMerchant.name || !newMerchant.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // TODO: Implement real merchant creation API call
    console.log('Creating new merchant:', newMerchant)
    
    toast({
      title: "Merchant Created",
      description: `${newMerchant.name} has been added to the system. They will receive onboarding instructions via email.`,
    })
    
    setShowCreateDialog(false)
    setNewMerchant({ name: "", email: "", businessType: "", website: "" })
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
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-merchant">
              <Plus className="h-4 w-4 mr-2" />
              Add Merchant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New Merchant
              </DialogTitle>
              <DialogDescription>
                Add a new merchant to the platform. They will receive onboarding instructions via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={newMerchant.name}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="TechCorp Inc"
                  data-testid="input-merchant-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMerchant.email}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@techcorp.com"
                  data-testid="input-merchant-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select value={newMerchant.businessType} onValueChange={(value) => setNewMerchant(prev => ({ ...prev, businessType: value }))}>
                  <SelectTrigger data-testid="select-merchant-business-type">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="saas">Software as a Service</SelectItem>
                    <SelectItem value="gaming">Gaming & Entertainment</SelectItem>
                    <SelectItem value="fintech">Financial Technology</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={newMerchant.website}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://techcorp.com"
                  data-testid="input-merchant-website"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMerchant} data-testid="button-create-merchant">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Merchant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-merchants">5</div>
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
            <div className="text-2xl font-bold" data-testid="text-total-volume">$530K</div>
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
                <SelectItem value="deactivated">Deactivated</SelectItem>
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
                          {merchant.status === 'approved' && (
                            <DropdownMenuItem 
                              onClick={() => handleMerchantAction('deactivate', merchant.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {merchant.status === 'deactivated' && (
                            <DropdownMenuItem onClick={() => handleMerchantAction('reactivate', merchant.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
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