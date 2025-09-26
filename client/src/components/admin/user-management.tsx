import { useState } from "react"
import { Users, Shield, UserPlus, Edit, Trash2, Eye, Lock, MoreVertical, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

type AdminRole = "super_admin" | "platform_admin" | "financial_admin" | "support_agent" | "viewer"

interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
  permissions: string[]
}

interface Permission {
  id: string
  name: string
  category: string
  description: string
}

export function UserManagement() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "viewer" as AdminRole,
    permissions: [] as string[]
  })

  // Mock admin users data
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    {
      id: "admin_001",
      name: "John Smith",
      email: "john@ruupay.com",
      role: "super_admin",
      status: "active",
      lastLogin: "2024-01-21 15:30",
      createdAt: "2024-01-01",
      permissions: ["*"]
    },
    {
      id: "admin_002", 
      name: "Sarah Johnson",
      email: "sarah@ruupay.com",
      role: "platform_admin",
      status: "active",
      lastLogin: "2024-01-21 14:15",
      createdAt: "2024-01-05",
      permissions: ["merchant_management", "settings_management", "integration_management"]
    },
    {
      id: "admin_003",
      name: "Mike Wilson",
      email: "mike@ruupay.com", 
      role: "financial_admin",
      status: "active",
      lastLogin: "2024-01-21 12:45",
      createdAt: "2024-01-10",
      permissions: ["fee_management", "revenue_tracking", "financial_reports"]
    },
    {
      id: "admin_004",
      name: "Lisa Chen",
      email: "lisa@ruupay.com",
      role: "support_agent",
      status: "active", 
      lastLogin: "2024-01-21 16:20",
      createdAt: "2024-01-15",
      permissions: ["merchant_view", "transaction_view", "customer_support"]
    }
  ])

  // Available permissions by category
  const availablePermissions: Permission[] = [
    // Merchant Management
    { id: "merchant_create", name: "Create Merchants", category: "Merchant Management", description: "Create new merchant accounts" },
    { id: "merchant_edit", name: "Edit Merchants", category: "Merchant Management", description: "Edit merchant profile and settings" },
    { id: "merchant_approve", name: "Approve Merchants", category: "Merchant Management", description: "Approve or reject merchant applications" },
    { id: "merchant_deactivate", name: "Deactivate Merchants", category: "Merchant Management", description: "Deactivate merchant accounts" },
    { id: "merchant_view", name: "View Merchants", category: "Merchant Management", description: "View merchant data and profiles" },
    
    // Financial Management
    { id: "fee_management", name: "Fee Management", category: "Financial", description: "Configure fees and pricing" },
    { id: "revenue_tracking", name: "Revenue Tracking", category: "Financial", description: "View revenue and partner earnings" },
    { id: "financial_reports", name: "Financial Reports", category: "Financial", description: "Generate financial reports" },
    
    // Platform Management
    { id: "settings_management", name: "Platform Settings", category: "Platform", description: "Configure platform settings" },
    { id: "integration_management", name: "Integration Management", category: "Platform", description: "Manage third-party integrations" },
    { id: "user_management", name: "User Management", category: "Platform", description: "Manage admin users and permissions" },
    
    // System Access
    { id: "transaction_view", name: "Transaction Monitoring", category: "System", description: "View transaction data and status" },
    { id: "webhook_management", name: "Webhook Management", category: "System", description: "Manage webhook configurations" },
    { id: "audit_logs", name: "Audit Logs", category: "System", description: "View system audit logs" },
    { id: "customer_support", name: "Customer Support", category: "System", description: "Access customer support tools" }
  ]

  // Role definitions with default permissions
  const roleDefinitions = {
    super_admin: {
      name: "Super Admin",
      description: "Full access to all platform features",
      permissions: ["*"]
    },
    platform_admin: {
      name: "Platform Admin", 
      description: "Manage merchants, settings, and integrations",
      permissions: ["merchant_create", "merchant_edit", "merchant_approve", "merchant_deactivate", "merchant_view", "settings_management", "integration_management"]
    },
    financial_admin: {
      name: "Financial Admin",
      description: "Manage fees, revenue tracking, and financial reports",
      permissions: ["fee_management", "revenue_tracking", "financial_reports", "merchant_view", "transaction_view"]
    },
    support_agent: {
      name: "Support Agent",
      description: "View-only access with customer support capabilities",
      permissions: ["merchant_view", "transaction_view", "customer_support"]
    },
    viewer: {
      name: "Viewer",
      description: "Read-only access to platform data",
      permissions: ["merchant_view", "transaction_view"]
    }
  }

  const getRoleBadge = (role: AdminRole) => {
    const variants = {
      super_admin: { variant: "default" as const, text: "Super Admin" },
      platform_admin: { variant: "secondary" as const, text: "Platform Admin" },
      financial_admin: { variant: "outline" as const, text: "Financial Admin" },
      support_agent: { variant: "secondary" as const, text: "Support Agent" },
      viewer: { variant: "outline" as const, text: "Viewer" }
    }
    const config = variants[role]
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, text: "Active" },
      inactive: { variant: "secondary" as const, text: "Inactive" },
      suspended: { variant: "destructive" as const, text: "Suspended" }
    }
    const config = variants[status as keyof typeof variants]
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const userPermissions = newUser.role === "super_admin" 
      ? ["*"] 
      : roleDefinitions[newUser.role].permissions

    const userData: AdminUser = {
      id: `admin_${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "active",
      lastLogin: "Never",
      createdAt: new Date().toISOString().split('T')[0],
      permissions: userPermissions
    }

    setAdminUsers(prev => [...prev, userData])

    toast({
      title: "Admin User Created",
      description: `${newUser.name} has been added with ${roleDefinitions[newUser.role].name} permissions.`
    })

    setShowCreateDialog(false)
    setNewUser({ name: "", email: "", role: "viewer", permissions: [] })
  }

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user)
    setShowEditDialog(true)
  }

  const handleDeleteUser = (userId: string) => {
    setAdminUsers(prev => prev.filter(user => user.id !== userId))
    toast({
      title: "User Deleted",
      description: "Admin user has been removed from the system.",
      variant: "destructive"
    })
  }

  const handleStatusToggle = (userId: string) => {
    setAdminUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" : "active" }
        : user
    ))
  }

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage admin users, roles, and permissions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Admin User
              </DialogTitle>
              <DialogDescription>
                Add a new admin user to the platform with specific role and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Full Name</Label>
                <Input
                  id="new-user-name"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter full name"
                  data-testid="input-new-user-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email Address</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({...prev, email: e.target.value}))}
                  placeholder="Enter email address"
                  data-testid="input-new-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({...prev, role: value as AdminRole}))}>
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleDefinitions).map(([role, def]) => (
                      <SelectItem key={role} value={role}>
                        {def.name} - {def.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} data-testid="button-create-user">
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Admin Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Admin Users
              </CardTitle>
              <CardDescription>
                Manage admin users and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {Object.entries(roleDefinitions).map(([role, def]) => (
                      <SelectItem key={role} value={role}>
                        {def.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                              {user.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLogin}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.createdAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-user-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusToggle(user.id)}>
                                <Lock className="mr-2 h-4 w-4" />
                                {user.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              {user.role !== "super_admin" && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
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
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Definitions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Definitions
                </CardTitle>
                <CardDescription>
                  Overview of available roles and their capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(roleDefinitions).map(([role, def]) => (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{def.name}</h4>
                      {getRoleBadge(role as AdminRole)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {def.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Permissions:</strong>{" "}
                      {role === "super_admin" 
                        ? "Full access to all features"
                        : `${def.permissions.length} specific permissions`
                      }
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Permission Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Permission Categories
                </CardTitle>
                <CardDescription>
                  Available permissions organized by category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{category}</h4>
                    <div className="space-y-1">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="text-sm">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {permission.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {adminUsers.length}
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <div className="text-2xl font-bold text-green-600" data-testid="text-active-users">
                  {adminUsers.filter(u => u.status === "active").length}
                </div>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Super Admins</p>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-super-admins">
                  {adminUsers.filter(u => u.role === "super_admin").length}
                </div>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Support Agents</p>
                <div className="text-2xl font-bold text-purple-600" data-testid="text-support-agents">
                  {adminUsers.filter(u => u.role === "support_agent").length}
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}