import { useState } from "react"
import { 
  Users, Settings, CreditCard, Webhook, 
  Building, BarChart3, Wallet,
  Home, FileText, Shield, Globe, ArrowDownToLine, ArrowUpFromLine,
  LogOut, ChevronUp
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppSidebarProps {
  userRole: "admin" | "merchant" | "customer"
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const [location] = useLocation()
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  // Fetch real user data based on role
  const { data: adminProfile } = useQuery({
    queryKey: ['/api/admin/profile'],
    enabled: userRole === 'admin',
    retry: false,
  })

  const { data: merchantProfile } = useQuery({
    queryKey: ['/api/merchant/profile'],
    enabled: userRole === 'merchant',
    retry: false,
  })

  // Admin logout mutation
  const adminLogoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/logout')
      return response.json()
    },
    onSuccess: () => {
      queryClient.clear()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
      setLocation('/admin/login')
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Merchant logout mutation
  const merchantLogoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/merchant/logout')
      return response.json()
    },
    onSuccess: () => {
      queryClient.clear()
      toast({
        title: "Logged out", 
        description: "You have been successfully logged out.",
      })
      setLocation('/merchant/login')
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Get current user data with proper type safety
  const currentUser = userRole === 'admin' ? adminProfile : merchantProfile
  const userName = currentUser ? 
    (userRole === 'admin' ? 
      `${(currentUser as any)?.firstName || ''} ${(currentUser as any)?.lastName || ''}`.trim() : 
      (currentUser as any)?.name || 'User'
    ) : 'Loading...'
  const userEmail = (currentUser as any)?.email || 'Loading...'
  const userInitials = currentUser ? 
    (userRole === 'admin' ? 
      `${(currentUser as any)?.firstName?.[0] || ''}${(currentUser as any)?.lastName?.[0] || ''}` : 
      (currentUser as any)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'
    ) : 'U'

  const handleLogout = () => {
    if (userRole === 'admin') {
      adminLogoutMutation.mutate()
    } else {
      merchantLogoutMutation.mutate()
    }
  }

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Merchants", url: "/admin/merchants", icon: Users },
    { title: "Permissions", url: "/admin/permissions", icon: Shield },
    { title: "Fee Config", url: "/admin/fees", icon: CreditCard },
    { title: "Webhooks", url: "/admin/webhooks", icon: Webhook },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ]

  const merchantItems = [
    { title: "Dashboard", url: "/merchant", icon: Home },
    { title: "Onboarding", url: "/merchant/onboarding", icon: FileText },
    { title: "Receive Crypto", url: "/merchant/receive-crypto", icon: ArrowDownToLine },
    { title: "Offramp Crypto", url: "/merchant/offramp-crypto", icon: ArrowUpFromLine },
    { title: "Manage Integrations", url: "/merchant/manage-integrations", icon: Globe },
    { title: "Accounts", url: "/merchant/accounts", icon: Wallet },
  ]

  const items = userRole === "admin" ? adminItems : merchantItems

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">Ruupay</span>
            <Badge variant="outline" className="w-fit text-xs">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Portal
            </Badge>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    data-active={location === item.url}
                    data-testid={`sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto hover:bg-accent/50"
                data-testid="button-user-menu"
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-sm text-left flex-1">
                    <span className="font-medium truncate" data-testid="text-user-name">{userName}</span>
                    <span className="text-muted-foreground text-xs truncate" data-testid="text-user-email">{userEmail}</span>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}