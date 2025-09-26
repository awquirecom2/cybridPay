import { useState, useEffect } from "react"
import { useRoute } from "wouter"
import { CheckCircle, AlertTriangle, ArrowLeft, Eye, EyeOff, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Registration form schema
const registrationSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  businessType: z.string().min(1, "Please select a business type"),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  phone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
  address: z.string().min(10, "Please enter a complete address").optional().or(z.literal("")),
  description: z.string().min(20, "Please provide at least 20 characters describing your business").optional().or(z.literal(""))
})

type RegistrationFormData = z.infer<typeof registrationSchema>

interface MerchantCredentials {
  username: string;
  password: string;
}

interface RegistrationResponse {
  success: boolean;
  merchant: {
    id: string;
    name: string;
    email: string;
  };
  credentials: MerchantCredentials;
  message: string;
}

export default function MerchantSignup() {
  const [, params] = useRoute("/signup/:token")
  const { toast } = useToast()
  const [registrationState, setRegistrationState] = useState<
    'loading' | 'form' | 'success' | 'error' | 'invalid_token'
  >('loading')
  const [errorMessage, setErrorMessage] = useState("")
  const [credentials, setCredentials] = useState<MerchantCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      businessType: "",
      website: "",
      phone: "",
      address: "",
      description: ""
    }
  })

  // Validate signup token on component mount
  useEffect(() => {
    if (!params?.token) {
      setRegistrationState('invalid_token')
      setErrorMessage("No signup token provided in URL")
      return
    }

    // Validate token with server
    validateToken(params.token)
  }, [params?.token])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch(`/api/signup/validate/${token}`)
      
      if (response.ok) {
        setRegistrationState('form')
      } else {
        const error = await response.json()
        setRegistrationState('invalid_token')
        setErrorMessage(error.error || "Invalid or expired signup token")
      }
    } catch (error) {
      setRegistrationState('error')
      setErrorMessage("Failed to validate signup token. Please try again.")
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    if (!params?.token) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: params.token,
          name: data.name,
          email: data.email,
          businessType: data.businessType,
          website: data.website || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
          description: data.description || undefined
        })
      })

      if (response.ok) {
        const result: RegistrationResponse = await response.json()
        setCredentials(result.credentials)
        setRegistrationState('success')
        toast({
          title: "Registration Successful",
          description: "Your merchant account has been created successfully.",
        })
      } else {
        const error = await response.json()
        setErrorMessage(error.error || "Registration failed")
        setRegistrationState('error')
      }
    } catch (error) {
      setErrorMessage("Network error. Please check your connection and try again.")
      setRegistrationState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  // Loading state
  if (registrationState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Validating signup link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token state
  if (registrationState === 'invalid_token') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400">Invalid Signup Link</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/'}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (registrationState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400">Registration Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => setRegistrationState('form')}
              data-testid="button-try-again"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state with credentials
  if (registrationState === 'success' && credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              Registration Successful!
            </CardTitle>
            <CardDescription>
              Your merchant account has been created. Save these credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save these credentials now. You won't see your password again.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Username</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={credentials.username}
                    readOnly
                    className="font-mono"
                    data-testid="input-username"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.username, "Username")}
                    data-testid="button-copy-username"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Password</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      readOnly
                      className="font-mono pr-10"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.password, "Password")}
                    data-testid="button-copy-password"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                onClick={() => window.location.href = '/merchant/login'}
                data-testid="button-login"
              >
                Login to Your Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Merchant Registration</h1>
          <p className="text-muted-foreground">
            Complete your merchant account setup to start accepting crypto payments
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Provide details about your business to create your merchant account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your business name"
                            data-testid="input-business-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="business@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger data-testid="select-business-type">
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="e-commerce">E-commerce</SelectItem>
                              <SelectItem value="saas">SaaS</SelectItem>
                              <SelectItem value="marketplace">Marketplace</SelectItem>
                              <SelectItem value="gaming">Gaming</SelectItem>
                              <SelectItem value="defi">DeFi</SelectItem>
                              <SelectItem value="nft">NFT</SelectItem>
                              <SelectItem value="fintech">Fintech</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://yourwebsite.com"
                            data-testid="input-website"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 (555) 123-4567"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Business St, City, State"
                            data-testid="input-address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your business, what you sell, and how you plan to use crypto payments..."
                          className="min-h-[100px]"
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.location.href = '/'}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                    data-testid="button-register"
                  >
                    {isSubmitting ? "Creating Account..." : "Create Merchant Account"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}