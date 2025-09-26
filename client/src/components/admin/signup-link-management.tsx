import { useState } from "react"
import { Plus, Copy, Trash2, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"

// Types for signup token data
interface SignupToken {
  id: string;
  token: string;
  expiresAt: string;
  used: boolean;
  usedByMerchantId: string | null;
  createdByAdminId: string | null;
  cybridCustomerType: string;
  notes: string | null;
  createdAt: string;
  usedAt: string | null;
}

interface CreateSignupLinkResponse {
  success: boolean;
  token: SignupToken;
  signupUrl: string;
  expiresAt: string;
}

export function SignupLinkManagement() {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showGeneratedLink, setShowGeneratedLink] = useState(false)
  const [generatedSignupUrl, setGeneratedSignupUrl] = useState("")
  const [newLink, setNewLink] = useState({
    expirationHours: 168, // 7 days default
    cybridCustomerType: "individual" as "individual" | "business",
    notes: ""
  })

  // Fetch signup tokens from API
  const { data: signupTokens = [], isLoading: tokensLoading, refetch: refetchTokens } = useQuery({
    queryKey: ['/api/admin/signup-links'],
    queryFn: async () => {
      const response = await fetch('/api/admin/signup-links')
      if (!response.ok) throw new Error('Failed to fetch signup tokens')
      return response.json() as Promise<SignupToken[]>
    }
  })

  // Create signup link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (linkData: { expirationHours: number; cybridCustomerType: "individual" | "business"; notes?: string }) => {
      const response = await apiRequest('POST', '/api/admin/signup-links', linkData)
      return await response.json() as CreateSignupLinkResponse
    },
    onSuccess: (data) => {
      toast({
        title: "Signup Link Created",
        description: "The merchant signup link has been generated successfully."
      })
      setGeneratedSignupUrl(data.signupUrl)
      setShowCreateDialog(false)
      setShowGeneratedLink(true)
      setNewLink({ expirationHours: 168, cybridCustomerType: "individual", notes: "" })
      queryClient.invalidateQueries({ queryKey: ['/api/admin/signup-links'] })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create signup link",
        variant: "destructive"
      })
    }
  })

  const handleCreateLink = () => {
    createLinkMutation.mutate({
      expirationHours: newLink.expirationHours,
      cybridCustomerType: newLink.cybridCustomerType,
      notes: newLink.notes || undefined
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Signup link copied to clipboard."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (token: SignupToken) => {
    const now = new Date()
    const expiresAt = new Date(token.expiresAt)
    
    if (token.used) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        Used
      </Badge>
    }
    
    if (expiresAt < now) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
        <XCircle className="w-3 h-3 mr-1" />
        Expired
      </Badge>
    }
    
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
      <Clock className="w-3 h-3 mr-1" />
      Active
    </Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getExpirationText = (hours: number) => {
    if (hours <= 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Merchant Signup Links</h1>
          <p className="text-muted-foreground mt-1">
            Generate time-limited signup links for merchant self-registration
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-signup-link">
              <Plus className="w-4 h-4 mr-2" />
              Generate New Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Merchant Signup Link</DialogTitle>
              <DialogDescription>
                Create a time-limited link that merchants can use to register themselves
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="expiration">Link Expiration</Label>
                <Select
                  value={newLink.expirationHours.toString()}
                  onValueChange={(value) => setNewLink(prev => ({ ...prev, expirationHours: parseInt(value) }))}
                >
                  <SelectTrigger data-testid="select-expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days (recommended)</SelectItem>
                    <SelectItem value="336">14 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="customerType">Cybrid Customer Type</Label>
                <Select
                  value={newLink.cybridCustomerType}
                  onValueChange={(value: "individual" | "business") => setNewLink(prev => ({ ...prev, cybridCustomerType: value }))}
                >
                  <SelectTrigger data-testid="select-customer-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual (Recommended for self-registration)</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Individual customers can complete KYC verification automatically. Business customers require manual KYB verification.
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this signup link..."
                  value={newLink.notes}
                  onChange={(e) => setNewLink(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLink} 
                disabled={createLinkMutation.isPending}
                data-testid="button-confirm-create"
              >
                {createLinkMutation.isPending ? "Generating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generated Link Success Dialog */}
      <Dialog open={showGeneratedLink} onOpenChange={setShowGeneratedLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Signup Link Created
            </DialogTitle>
            <DialogDescription>
              Share this link with the merchant. They can use it to register themselves and receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Signup URL</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedSignupUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-generated-url"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(generatedSignupUrl)}
                  data-testid="button-copy-url"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              This link will expire in {getExpirationText(newLink.expirationHours)}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowGeneratedLink(false)} data-testid="button-done">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signup Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Signup Links</CardTitle>
          <CardDescription>
            Manage and track merchant signup links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading signup links...
            </div>
          ) : signupTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No signup links generated yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Customer Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signupTokens.map((token) => (
                  <TableRow key={token.id} data-testid={`row-token-${token.token.slice(0, 8)}`}>
                    <TableCell>
                      {getStatusBadge(token)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {token.token.slice(0, 8)}...{token.token.slice(-4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.cybridCustomerType === 'individual' ? 'default' : 'secondary'} className="capitalize">
                        {token.cybridCustomerType || 'individual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.expiresAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {token.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`${window.location.origin}/signup/${token.token}`)}
                          disabled={token.used || new Date(token.expiresAt) < new Date()}
                          data-testid={`button-copy-${token.token.slice(0, 8)}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}