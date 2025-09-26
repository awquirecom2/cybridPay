import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LogIn, Building2 } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

export default function MerchantLogin() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  })

  // Check if merchant is already authenticated
  const { data: merchant } = useQuery({
    queryKey: ['/api/merchant/profile'],
    queryFn: async () => {
      const response = await fetch('/api/merchant/profile')
      if (response.status === 401) return null
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
    retry: false
  })

  // Redirect if already authenticated (moved to useEffect to avoid render-time state updates)
  useEffect(() => {
    if (merchant) {
      setLocation('/merchant')
    }
  }, [merchant, setLocation])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (loginData: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/merchant/login', loginData)
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Login failed')
      }
      return await response.json()
    },
    onSuccess: (data) => {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.merchant?.name || 'Merchant'}!`,
      })
      setLocation('/merchant')
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password. Please try again.",
        variant: "destructive",
      })
    }
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Validation Error",
        description: "Please enter both username and password.",
        variant: "destructive"
      })
      return
    }

    loginMutation.mutate(credentials)
  }

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Merchant Portal</CardTitle>
              <CardDescription>
                Sign in to access your merchant dashboard and manage crypto payments
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={loginMutation.isPending}
                  data-testid="input-username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={loginMutation.isPending}
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  New merchant? Contact your administrator for account setup.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLocation('/')}
                  data-testid="button-back-home"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Secure crypto payment processing powered by Ruupay</p>
        </div>
      </div>
    </div>
  )
}