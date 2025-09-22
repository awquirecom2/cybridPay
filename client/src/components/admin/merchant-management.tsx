import { useState, useEffect } from "react"
import { Search, Filter, Plus, Edit, CheckCircle, XCircle, Clock, MoreVertical, UserPlus, Ban, RefreshCw, Wallet, AlertTriangle, KeyRound, RotateCcw } from "lucide-react"
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
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"

// Types for merchant data
interface MerchantData {
  id: string;
  name: string;
  email: string;
  businessType: string;
  website: string;
  phone?: string;
  address?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deactivated';
  kybStatus: 'pending' | 'approved' | 'rejected' | 'in_review';
  customFeeEnabled: boolean;
  customFeePercentage: string;
  customFlatFee: string;
  payoutMethod: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  notes?: string;
  integrations: string[];
  volume: string;
  dateOnboarded: string;
  cybridCustomerGuid?: string;
  cybridCustomerType?: 'business' | 'individual';
  cybridIntegrationStatus?: 'none' | 'pending' | 'active' | 'error';
  cybridLastError?: string;
}

interface CybridStatusData {
  hasCustomer: boolean;
  cybridCustomerGuid: string | null;
  integrationStatus: string;
  customer?: {
    guid: string;
    name: {
      first?: string;
      last?: string;
      full?: string;
    };
    state: string;
    type: string;
  };
  error?: string;
}

export function MerchantManagement() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCybridDialog, setShowCybridDialog] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantData | null>(null)
  const [cybridStatus, setCybridStatus] = useState<CybridStatusData | null>(null)
  const [newMerchant, setNewMerchant] = useState({
    name: "",
    email: "",
    businessType: "",
    website: "",
    cybridCustomerType: "business"
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

  // State for showing generated credentials
  const [showCredentials, setShowCredentials] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string; password: string} | null>(null)
  
  // State for reset credentials
  const [showResetCredentials, setShowResetCredentials] = useState(false)
  const [resetCredentials, setResetCredentials] = useState<{username: string; password: string} | null>(null)
  const [resetMerchantName, setResetMerchantName] = useState("")

  // State for customer type selection
  const [customerType, setCustomerType] = useState<"business" | "individual">("business")

  // Fetch merchants from API
  const { data: merchants = [], isLoading: merchantsLoading, refetch: refetchMerchants } = useQuery({
    queryKey: ['/api/admin/merchants'],
    queryFn: async () => {
      const response = await fetch('/api/admin/merchants')
      if (!response.ok) throw new Error('Failed to fetch merchants')
      return response.json() as Promise<MerchantData[]>
    }
  })

  // Create merchant mutation
  const createMerchantMutation = useMutation({
    mutationFn: async (merchantData: any) => {
      const response = await apiRequest('POST', '/api/admin/merchants', merchantData)
      return await response.json()
    },
    onSuccess: (data: any) => {
      setGeneratedCredentials(data.credentials)
      setShowCredentials(true)
      setShowCreateDialog(false)
      setNewMerchant({ name: "", email: "", businessType: "", website: "", cybridCustomerType: "business" })
      refetchMerchants()
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })
      toast({
        title: "Merchant Created",
        description: "New merchant has been created successfully with login credentials.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create merchant. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Update merchant mutation
  const updateMerchantMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest('PUT', `/api/admin/merchants/${id}`, updates)
      return await response.json()
    },
    onSuccess: () => {
      setShowEditDialog(false)
      refetchMerchants()
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })
      toast({
        title: "Merchant Updated",
        description: "Merchant information has been updated successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update merchant. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Cybrid customer creation mutation
  const createCybridCustomerMutation = useMutation({
    mutationFn: async (params: { merchantId: string; customerType: "business" | "individual" }) => {
      const response = await apiRequest('POST', `/api/admin/merchants/${params.merchantId}/cybrid-customer`, {
        type: params.customerType
      })
      return await response.json()
    },
    onSuccess: () => {
      refetchMerchants()
      toast({
        title: "Cybrid Customer Created",
        description: "Cybrid customer account created successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Cybrid customer.",
        variant: "destructive",
      })
    }
  })

  // Cybrid status fetch mutation
  const fetchCybridStatusMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const response = await fetch(`/api/admin/merchants/${merchantId}/cybrid-status`)
      if (!response.ok) throw new Error('Failed to fetch Cybrid status')
      return await response.json() as CybridStatusData
    },
    onSuccess: (data) => {
      setCybridStatus(data)
      setShowCybridDialog(true)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch Cybrid status.",
        variant: "destructive",
      })
    }
  })

  // Reset merchant credentials mutation
  const resetCredentialsMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const response = await apiRequest('POST', `/api/admin/merchants/${merchantId}/reset-credentials`)
      return await response.json()
    },
    onSuccess: (data: any) => {
      setResetCredentials(data.credentials)
      setResetMerchantName(data.merchantName)
      setShowResetCredentials(true)
      refetchMerchants()
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })
      toast({
        title: "Credentials Reset",
        description: "New login credentials have been generated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reset credentials. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Bulk sync KYC status mutation
  const bulkSyncKycMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/merchants/sync-kyc')
      return await response.json()
    },
    onSuccess: (data: any) => {
      refetchMerchants()
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })
      toast({
        title: "KYC Sync Completed",
        description: data.message || "KYC statuses have been updated from Cybrid",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Sync Error",
        description: "Failed to sync KYC statuses. Please try again.",
        variant: "destructive",
      })
    }
  })

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
      approved: { variant: "default" as const, text: "Verified" },
      in_review: { variant: "secondary" as const, text: "In Review" },
      pending: { variant: "secondary" as const, text: "Pending" },
      rejected: { variant: "destructive" as const, text: "Rejected" }
    }
    const config = variants[kybStatus as keyof typeof variants] || variants.pending
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const getCybridStatusBadge = (status: string | undefined) => {
    if (!status || status === 'none') {
      return (
        <Badge variant="outline" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Not Setup
        </Badge>
      )
    }

    const variants = {
      active: { variant: "default" as const, icon: CheckCircle, text: "Active" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      error: { variant: "destructive" as const, icon: XCircle, text: "Error" }
    }
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="text-xs flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const filteredMerchants = merchants.filter((merchant: MerchantData) => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleMerchantAction = (action: string, merchantId: string) => {
    const merchant = merchants.find((m: MerchantData) => m.id === merchantId)
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

    // Cybrid management actions
    if (action === 'cybrid-status') {
      setSelectedMerchant(merchant)
      setCustomerType("business") // Reset to default when opening dialog
      fetchCybridStatusMutation.mutate(merchantId)
      return
    }

    if (action === 'cybrid-create') {
      createCybridCustomerMutation.mutate({ merchantId, customerType: "business" })
      return
    }

    if (action === 'reset-credentials') {
      resetCredentialsMutation.mutate(merchantId)
      return
    }

    // Update merchant status via API
    let newStatus = ''
    switch (action) {
      case 'approve':
        newStatus = 'approved'
        break
      case 'reject':
        newStatus = 'rejected'
        break
      case 'deactivate':
        newStatus = 'deactivated'
        break
      case 'reactivate':
        newStatus = 'approved'
        break
      default:
        return
    }

    updateMerchantMutation.mutate({
      id: merchantId,
      updates: { status: newStatus }
    })

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

    createMerchantMutation.mutate(newMerchant)
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

    updateMerchantMutation.mutate({
      id: selectedMerchant.id,
      updates: editMerchant
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => bulkSyncKycMutation.mutate()}
            disabled={bulkSyncKycMutation.isPending}
            data-testid="button-sync-kyc"
          >
            {bulkSyncKycMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Sync KYC Status
          </Button>
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
              <div className="space-y-2">
                <Label htmlFor="cybridCustomerType">Cybrid Customer Type</Label>
                <Select value={newMerchant.cybridCustomerType} onValueChange={(value: "business" | "individual") => setNewMerchant(prev => ({ ...prev, cybridCustomerType: value }))}>
                  <SelectTrigger data-testid="select-merchant-cybrid-customer-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business Customer</SelectItem>
                    <SelectItem value="individual">Individual Customer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This determines the KYC/KYB verification type when the merchant is approved
                </p>
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

      {/* Credentials Display Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Merchant Credentials Generated
            </DialogTitle>
            <DialogDescription>
              Here are the login credentials for the new merchant. Please share these securely with the merchant.
            </DialogDescription>
          </DialogHeader>
          
          {generatedCredentials && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <div className="mt-1 p-2 bg-background rounded border font-mono text-sm">
                    {generatedCredentials.username}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Password</Label>
                  <div className="mt-1 p-2 bg-background rounded border font-mono text-sm">
                    {generatedCredentials.password}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex-shrink-0 mt-0.5"></div>
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Important:</p>
                  <p>Store these credentials securely. The merchant will use these to access their portal at <code>/merchant/login</code>.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredentials(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (generatedCredentials) {
                  navigator.clipboard.writeText(`Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}`)
                  toast({ title: "Copied!", description: "Credentials copied to clipboard" })
                }
              }}
              data-testid="button-copy-credentials"
            >
              Copy Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Credentials Display Dialog */}
      <Dialog open={showResetCredentials} onOpenChange={setShowResetCredentials}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Credentials Reset Complete
            </DialogTitle>
            <DialogDescription>
              New login credentials have been generated for {resetMerchantName}. Please securely share these with the merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Username</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={resetCredentials?.username || ''}
                      readOnly
                      className="font-mono"
                      data-testid="text-reset-username"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(resetCredentials?.username || '')
                        toast({ title: "Copied", description: "Username copied to clipboard" })
                      }}
                      data-testid="button-copy-reset-username"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={resetCredentials?.password || ''}
                      readOnly
                      className="font-mono"
                      data-testid="text-reset-password"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(resetCredentials?.password || '')
                        toast({ title: "Copied", description: "Password copied to clipboard" })
                      }}
                      data-testid="button-copy-reset-password"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important Security Notice</p>
                <p className="text-xs mt-1">
                  These credentials should be shared securely with the merchant and they should change their password upon first login.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowResetCredentials(false)
                setResetCredentials(null)
                setResetMerchantName("")
              }}
              data-testid="button-close-reset-credentials"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cybrid Status Dialog */}
      <Dialog open={showCybridDialog} onOpenChange={setShowCybridDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Cybrid Integration Status
            </DialogTitle>
            <DialogDescription>
              {selectedMerchant ? `Cybrid integration details for ${selectedMerchant.name}` : 'Cybrid integration details'}
            </DialogDescription>
          </DialogHeader>
          
          {cybridStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Integration Status</Label>
                  <div className="mt-1">
                    {getCybridStatusBadge(cybridStatus.integrationStatus)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer Exists</Label>
                  <div className="mt-1">
                    <Badge variant={cybridStatus.hasCustomer ? "default" : "outline"}>
                      {cybridStatus.hasCustomer ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>

              {cybridStatus.cybridCustomerGuid && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer GUID</Label>
                  <div className="mt-1 p-2 bg-muted rounded border font-mono text-xs break-all">
                    {cybridStatus.cybridCustomerGuid}
                  </div>
                </div>
              )}

              {cybridStatus.customer && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Customer Details</Label>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {cybridStatus.customer.name?.full || 
                         (cybridStatus.customer.name?.first && cybridStatus.customer.name?.last 
                           ? `${cybridStatus.customer.name.first} ${cybridStatus.customer.name.last}` 
                           : 'N/A')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">State:</span>
                      <span className="font-medium capitalize">{cybridStatus.customer.state}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{cybridStatus.customer.type}</span>
                    </div>
                  </div>
                </div>
              )}

              {cybridStatus.error && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Error Details</p>
                      <p className="text-sm text-destructive/80 mt-1">{cybridStatus.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Type Display - show the type selected during merchant creation */}
          {selectedMerchant && (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer Type</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {(selectedMerchant.cybridCustomerType || 'business') === 'business' ? 'Business Customer' : 'Individual Customer'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Customer type was selected during merchant creation and cannot be changed
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCybridDialog(false)}>
              Close
            </Button>
            {selectedMerchant && (!cybridStatus?.hasCustomer || cybridStatus?.integrationStatus === 'error') && (
              <Button 
                onClick={() => {
                  if (selectedMerchant) {
                    setShowCybridDialog(false)
                    const storedCustomerType = (selectedMerchant.cybridCustomerType || 'business') as "business" | "individual"
                    createCybridCustomerMutation.mutate({ merchantId: selectedMerchant.id, customerType: storedCustomerType })
                  }
                }}
                disabled={createCybridCustomerMutation.isPending}
                data-testid="button-create-cybrid-customer"
              >
                {createCybridCustomerMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {cybridStatus?.hasCustomer ? 'Retry Setup' : `Create ${(selectedMerchant.cybridCustomerType || 'business') === 'business' ? 'Business' : 'Individual'} Customer`}
              </Button>
            )}
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
                  <TableHead>Cybrid</TableHead>
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
                      {getCybridStatusBadge(merchant.cybridIntegrationStatus)}
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
                          
                          {/* Credential Management */}
                          <DropdownMenuItem 
                            onClick={() => handleMerchantAction('reset-credentials', merchant.id)}
                            className="text-amber-600 focus:text-amber-600"
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Credentials
                          </DropdownMenuItem>
                          
                          {/* Cybrid Management Actions */}
                          <DropdownMenuItem onClick={() => handleMerchantAction('cybrid-status', merchant.id)}>
                            <Wallet className="h-4 w-4 mr-2" />
                            View Cybrid Status
                          </DropdownMenuItem>
                          {(!merchant.cybridCustomerGuid || merchant.cybridIntegrationStatus === 'error') && (
                            <DropdownMenuItem onClick={() => handleMerchantAction('cybrid-create', merchant.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              {merchant.cybridCustomerGuid ? 'Retry Cybrid Setup' : 'Create Cybrid Customer'}
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