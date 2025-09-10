import { useState } from "react"
import { 
  Users, Settings, CreditCard, Webhook, 
  Building, BarChart3, Wallet,
  Home, FileText, Shield, Globe, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react"
import { Link, useLocation } from "wouter"
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

interface AppSidebarProps {
  userRole: "admin" | "merchant" | "customer"
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const [location] = useLocation()

  // TODO: remove mock functionality - replace with real user data
  const mockUser = {
    name: userRole === "admin" ? "Admin User" : userRole === "merchant" ? "Merchant Owner" : "Customer",
    email: userRole === "admin" ? "admin@cryptopay.com" : userRole === "merchant" ? "merchant@example.com" : "customer@example.com",
    avatar: ""
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
            <span className="font-semibold text-lg">CryptoPay</span>
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
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={mockUser.avatar} />
              <AvatarFallback>{mockUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm">
              <span className="font-medium" data-testid="text-user-name">{mockUser.name}</span>
              <span className="text-muted-foreground text-xs" data-testid="text-user-email">{mockUser.email}</span>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}