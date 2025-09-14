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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function MerchantManagement() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [newMerchant, setNewMerchant] = useState({
    name: "",
    email: "",
    businessType: "",
    website: ""
  })
  const [editMerchant, setEditMerchant] = useState({
    name: "",
    email: "",
    businessType: "",
    website: "",
    phone: "",
    address: "",
    description: "",
    kybStatus: "",
    customFeeEnabled: false,
    customFeePercentage: "2.5",
    customFlatFee: "0.30",
    payoutMethod: "bank_transfer",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    notes: ""
  })

  // TODO: remove mock functionality - replace with real merchant data
  const [merchants, setMerchants] = useState([
    {
      id: "merch_001",
      name: "TechCorp Inc",
      email: "admin@techcorp.com",
      status: "approved",
      kybStatus: "verified",
      dateOnboarded: "2024-01-15",
      integrations: ["transak", "cybrid"],
      volume: "$125,000",
      businessType: "Technology",
      website: "https://techcorp.com",
      phone: "+1-555-0101",
      address: "123 Tech Street, San Francisco, CA 94105",
      description: "Leading technology solutions provider",
      customFeeEnabled: true,
      customFeePercentage: "2.0",
      customFlatFee: "0.25",
      payoutMethod: "bank_transfer",
      bankAccountNumber: "****1234",
      bankRoutingNumber: "****5678",
      notes: "High volume merchant, preferred partner"
    },
    {
      id: "merch_002", 
      name: "Digital Goods Ltd",
      email: "finance@digitalgoods.com",
      status: "pending",
      kybStatus: "review",
      dateOnboarded: "2024-01-20",
      integrations: ["transak"],
      volume: "$45,000",
      businessType: "Digital Services",
      website: "https://digitalgoods.com",
      phone: "+1-555-0202",
      address: "456 Digital Ave, New York, NY 10001",
      description: "Digital goods marketplace",
      customFeeEnabled: false,
      customFeePercentage: "2.5",
      customFlatFee: "0.30",
      payoutMethod: "debit_card",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      notes: "Pending KYB verification"
    },
    {
      id: "merch_003",
      name: "CryptoShop",
      email: "payments@cryptoshop.io",
      status: "approved",
      kybStatus: "verified", 
      dateOnboarded: "2024-01-10",
      integrations: ["transak", "cybrid"],
      volume: "$285,000",
      businessType: "E-commerce",
      website: "https://cryptoshop.io",
      phone: "+1-555-0303",
      address: "789 Crypto Blvd, Austin, TX 78701",
      description: "Cryptocurrency trading platform",
      customFeeEnabled: true,
      customFeePercentage: "1.8",
      customFlatFee: "0.20",
      payoutMethod: "bank_transfer",
      bankAccountNumber: "****9876",
      bankRoutingNumber: "****4321",
      notes: "Enterprise client with volume discounts"
    },
    {
      id: "merch_004",
      name: "GameFi Platform",
      email: "business@gamefi.game",
      status: "rejected",
      kybStatus: "failed",
      dateOnboarded: "2024-01-22",
      integrations: [],
      volume: "$0",
      businessType: "Gaming",
      website: "https://gamefi.game",
      phone: "+1-555-0404",
      address: "321 Gaming Way, Los Angeles, CA 90210",
      description: "GameFi and NFT marketplace",
      customFeeEnabled: false,
      customFeePercentage: "2.5",
      customFlatFee: "0.30",
      payoutMethod: "bank_transfer",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      notes: "KYB failed - high risk jurisdiction"
    },
    {
      id: "merch_005",
      name: "E-commerce Plus",
      email: "admin@ecommerceplus.com",
      status: "deactivated",
      kybStatus: "verified",
      dateOnboarded: "2024-01-05",
      integrations: ["transak"],
      volume: "$75,000",
      businessType: "E-commerce",
      website: "https://ecommerceplus.com",
      phone: "+1-555-0505",
      address: "654 Commerce St, Chicago, IL 60601",
      description: "Online retail platform",
      customFeeEnabled: false,
      customFeePercentage: "2.5",
      customFlatFee: "0.30",
      payoutMethod: "debit_card",
      bankAccountNumber: "****5555",
      bankRoutingNumber: "****1111",
      notes: "Temporarily deactivated for compliance review"
    }
  ])

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
      pending: { variant: "secondary" as const, text: "Pending" },
      failed: { variant: "destructive" as const, text: "Failed" }
    }
    const config = variants[kybStatus as keyof typeof variants]
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleMerchantAction = (action: string, merchantId: string) => {
    const merchant = merchants.find(m => m.id === merchantId)
    if (!merchant) return

    if (action === 'edit') {
      setSelectedMerchant(merchant)
      setEditMerchant({
        name: merchant.name,
        email: merchant.email,
        businessType: merchant.businessType || "",
        website: merchant.website || "",
        phone: merchant.phone || "",
        address: merchant.address || "",
        description: merchant.description || "",
        kybStatus: merchant.kybStatus,
        customFeeEnabled: merchant.customFeeEnabled || false,
        customFeePercentage: merchant.customFeePercentage || "2.5",
        customFlatFee: merchant.customFlatFee || "0.30",
        payoutMethod: merchant.payoutMethod || "bank_transfer",
        bankAccountNumber: merchant.bankAccountNumber || "",
        bankRoutingNumber: merchant.bankRoutingNumber || "",
        notes: merchant.notes || ""
      })
      setShowEditDialog(true)
      return
    }

    setMerchants(prev => prev.map(m => {
      if (m.id === merchantId) {
        switch (action) {
          case 'approve':
            return { ...m, status: 'approved' }
          case 'reject':
            return { ...m, status: 'rejected' }
          case 'deactivate':
            return { ...m, status: 'deactivated' }
          case 'reactivate':
            return { ...m, status: 'approved' }
          default:
            return m
        }
      }
      return m
    }))

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
    const newMerchantData = {
      id: `merch_${Date.now()}`,
      name: newMerchant.name,
      email: newMerchant.email,
      status: 'pending',
      kybStatus: 'pending',
      dateOnboarded: new Date().toISOString().split('T')[0],
      integrations: [],
      volume: '$0',
      businessType: newMerchant.businessType || "",
      website: newMerchant.website || "",
      phone: "",
      address: "",
      description: "",
      customFeeEnabled: false,
      customFeePercentage: "2.5",
      customFlatFee: "0.30",
      payoutMethod: "bank_transfer",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      notes: "New merchant - pending onboarding"
    }
    
    setMerchants(prev => [...prev, newMerchantData])
    
    toast({
      title: "Merchant Created",
      description: `${newMerchant.name} has been added to the system. They will receive onboarding instructions via email.`,
    })
    
    setShowCreateDialog(false)
    setNewMerchant({ name: "", email: "", businessType: "", website: "" })
  }

  const handleUpdateMerchant = async () => {
    if (!editMerchant.name || !editMerchant.email || !selectedMerchant) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // TODO: Implement real merchant update API call
    setMerchants(prev => prev.map(m => 
      m.id === selectedMerchant.id 
        ? { 
            ...m, 
            ...editMerchant,
            businessType: editMerchant.businessType,
            website: editMerchant.website,
            phone: editMerchant.phone,
            address: editMerchant.address,
            description: editMerchant.description,
            customFeeEnabled: editMerchant.customFeeEnabled,
            customFeePercentage: editMerchant.customFeePercentage,
            customFlatFee: editMerchant.customFlatFee,
            payoutMethod: editMerchant.payoutMethod,
            bankAccountNumber: editMerchant.bankAccountNumber,
            bankRoutingNumber: editMerchant.bankRoutingNumber,
            notes: editMerchant.notes
          }
        : m
    ))
    
    toast({
      title: "Merchant Updated",
      description: `${editMerchant.name} profile has been updated successfully.`,
    })
    
    setShowEditDialog(false)
    setSelectedMerchant(null)
    setEditMerchant({
      name: "",
      email: "",
      businessType: "",
      website: "",
      phone: "",
      address: "",
      description: "",
      kybStatus: "",
      customFeeEnabled: false,
      customFeePercentage: "2.5",
      customFlatFee: "0.30",
      payoutMethod: "bank_transfer",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      notes: ""
    })
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

      {/* Edit Merchant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Merchant Profile
            </DialogTitle>
            <DialogDescription>
              Update merchant profile, settings, and financial configuration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Business Name</Label>
                  <Input
                    id="edit-name"
                    value={editMerchant.name}
                    onChange={(e) => setEditMerchant(prev => ({...prev, name: e.target.value}))}
                    data-testid="input-edit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editMerchant.email}
                    onChange={(e) => setEditMerchant(prev => ({...prev, email: e.target.value}))}
                    data-testid="input-edit-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-business-type">Business Type</Label>
                  <Select value={editMerchant.businessType} onValueChange={(value) => setEditMerchant(prev => ({...prev, businessType: value}))}>
                    <SelectTrigger data-testid="select-edit-business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Digital Services">Digital Services</SelectItem>
                      <SelectItem value="Gaming">Gaming</SelectItem>
                      <SelectItem value="Fintech">Fintech</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website URL</Label>
                  <Input
                    id="edit-website"
                    value={editMerchant.website}
                    onChange={(e) => setEditMerchant(prev => ({...prev, website: e.target.value}))}
                    data-testid="input-edit-website"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editMerchant.phone}
                    onChange={(e) => setEditMerchant(prev => ({...prev, phone: e.target.value}))}
                    data-testid="input-edit-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-kyb-status">KYB Status</Label>
                  <Select value={editMerchant.kybStatus} onValueChange={(value) => setEditMerchant(prev => ({...prev, kybStatus: value}))}>
                    <SelectTrigger data-testid="select-edit-kyb-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Business Address</Label>
                <Input
                  id="edit-address"
                  value={editMerchant.address}
                  onChange={(e) => setEditMerchant(prev => ({...prev, address: e.target.value}))}
                  placeholder="123 Business St, City, State 12345"
                  data-testid="input-edit-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Business Description</Label>
                <Input
                  id="edit-description"
                  value={editMerchant.description}
                  onChange={(e) => setEditMerchant(prev => ({...prev, description: e.target.value}))}
                  placeholder="Brief description of business"
                  data-testid="input-edit-description"
                />
              </div>
            </div>

            {/* Financial Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Financial Configuration</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="custom-fees"
                  checked={editMerchant.customFeeEnabled}
                  onCheckedChange={(checked) => setEditMerchant(prev => ({...prev, customFeeEnabled: checked}))}
                  data-testid="switch-custom-fees"
                />
                <Label htmlFor="custom-fees">Enable Custom Fee Structure</Label>
              </div>
              
              {editMerchant.customFeeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fee-percentage">Fee Percentage (%)</Label>
                    <Input
                      id="edit-fee-percentage"
                      type="number"
                      step="0.1"
                      value={editMerchant.customFeePercentage}
                      onChange={(e) => setEditMerchant(prev => ({...prev, customFeePercentage: e.target.value}))}
                      data-testid="input-edit-fee-percentage"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-flat-fee">Flat Fee ($)</Label>
                    <Input
                      id="edit-flat-fee"
                      type="number"
                      step="0.01"
                      value={editMerchant.customFlatFee}
                      onChange={(e) => setEditMerchant(prev => ({...prev, customFlatFee: e.target.value}))}
                      data-testid="input-edit-flat-fee"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payout Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Payout Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-payout-method">Preferred Payout Method</Label>
                  <Select value={editMerchant.payoutMethod} onValueChange={(value) => setEditMerchant(prev => ({...prev, payoutMethod: value}))}>
                    <SelectTrigger data-testid="select-edit-payout-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="sepa_transfer">SEPA Transfer</SelectItem>
                      <SelectItem value="gbp_transfer">UK Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {(editMerchant.payoutMethod === "bank_transfer" || editMerchant.payoutMethod === "sepa_transfer" || editMerchant.payoutMethod === "gbp_transfer") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="edit-bank-account">Bank Account Number</Label>
                    <Input
                      id="edit-bank-account"
                      value={editMerchant.bankAccountNumber}
                      onChange={(e) => setEditMerchant(prev => ({...prev, bankAccountNumber: e.target.value}))}
                      placeholder="****1234"
                      data-testid="input-edit-bank-account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-routing-number">Routing Number</Label>
                    <Input
                      id="edit-routing-number"
                      value={editMerchant.bankRoutingNumber}
                      onChange={(e) => setEditMerchant(prev => ({...prev, bankRoutingNumber: e.target.value}))}
                      placeholder="****5678"
                      data-testid="input-edit-routing-number"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes and Comments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Admin Notes</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Internal Notes</Label>
                <textarea
                  id="edit-notes"
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                  value={editMerchant.notes}
                  onChange={(e) => setEditMerchant(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Internal notes about this merchant..."
                  data-testid="textarea-edit-notes"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMerchant} data-testid="button-update-merchant">
              <Edit className="h-4 w-4 mr-2" />
              Update Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-merchants">{merchants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-merchants">{merchants.filter(m => m.status === 'approved').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-merchants">{merchants.filter(m => m.status === 'pending').length}</div>
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