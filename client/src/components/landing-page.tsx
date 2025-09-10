import { useState } from "react"
import { Link } from "wouter"
import { Building, Shield, Users, ArrowRight, Wallet, Globe, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export function LandingPage() {
  console.log('Landing page rendered')

  const portals = [
    {
      title: "Administration Portal",
      description: "Manage merchants, configure fees, handle permissions and monitor webhooks",
      icon: Shield,
      href: "/admin",
      features: ["Merchant Management", "Role-based Access", "Fee Configuration", "Webhook Monitoring"]
    },
    {
      title: "Merchant Portal", 
      description: "Complete your KYB onboarding, manage API keys and configure payment integrations",
      icon: Building,
      href: "/merchant",
      features: ["KYB Onboarding", "API Key Management", "Transak Integration", "Cybrid Setup"]
    },
    {
      title: "Customer Payment",
      description: "Secure fiat-to-crypto payment processing with real-time transaction updates",
      icon: Wallet,
      href: "/pay/demo-merchant",
      features: ["Fiat-to-Crypto", "Real-time Updates", "Multiple Currencies", "Secure Processing"]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl">CryptoPay</span>
              <span className="text-xs text-muted-foreground">Payment Platform</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Professional Cryptocurrency Payment Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Seamlessly integrate fiat-to-crypto payments with Transak and Cybrid infrastructure. 
            Complete merchant onboarding, admin management, and customer payment flows.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">$50M+</div>
              <div className="text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Merchants</div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="flex flex-col items-center text-center p-6">
              <Globe className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Global Coverage</h3>
              <p className="text-muted-foreground">Support for 100+ countries with local compliance</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
              <p className="text-muted-foreground">Bank-grade security with SOC 2 compliance</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-muted-foreground">Comprehensive dashboards and reporting</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Selection */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Portal</h2>
            <p className="text-xl text-muted-foreground">
              Access the right tools for your role in the payment ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portals.map((portal) => (
              <Card key={portal.title} className="hover-elevate transition-all duration-200 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <portal.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">{portal.title}</CardTitle>
                  <CardDescription className="text-base">
                    {portal.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {portal.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild 
                    className="w-full group"
                    data-testid={`button-enter-${portal.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={portal.href}>
                      Enter Portal
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 CryptoPay. Professional cryptocurrency payment infrastructure.
          </p>
        </div>
      </footer>
    </div>
  )
}