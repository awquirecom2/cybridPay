import { useState } from "react"
import { DollarSign, Percent, Calendar, Save, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function FeeConfiguration() {
  const { toast } = useToast()
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [globalFees, setGlobalFees] = useState({
    percentage: "2.5",
    flatFee: "0.30",
    currency: "USD"
  })

  // TODO: remove mock functionality - replace with real fee configuration
  const merchantFees = [
    {
      id: "merch_001",
      name: "TechCorp Inc",
      percentage: "2.0",
      flatFee: "0.25",
      currency: "USD",
      customFees: true,
      volume: "$125,000",
      effectiveDate: "2024-01-15"
    },
    {
      id: "merch_002",
      name: "Digital Goods Ltd", 
      percentage: "2.5",
      flatFee: "0.30",
      currency: "USD",
      customFees: false,
      volume: "$45,000",
      effectiveDate: "2024-01-20"
    },
    {
      id: "merch_003",
      name: "CryptoShop",
      percentage: "1.8",
      flatFee: "0.20",
      currency: "USD", 
      customFees: true,
      volume: "$285,000",
      effectiveDate: "2024-01-10"
    }
  ]

  const scheduledChanges = [
    {
      id: "change_001",
      merchant: "TechCorp Inc",
      currentFee: "2.0%",
      newFee: "1.9%",
      effectiveDate: "2024-02-01",
      reason: "Volume tier upgrade"
    },
    {
      id: "change_002",
      merchant: "Global Default",
      currentFee: "2.5%",
      newFee: "2.4%",
      effectiveDate: "2024-02-15",
      reason: "Market adjustment"
    }
  ]

  const volumeTiers = [
    { tier: "Starter", minVolume: "$0", maxVolume: "$10K", percentage: "2.5%", flatFee: "$0.30" },
    { tier: "Growth", minVolume: "$10K", maxVolume: "$100K", percentage: "2.0%", flatFee: "$0.25" },
    { tier: "Scale", minVolume: "$100K", maxVolume: "$500K", percentage: "1.8%", flatFee: "$0.20" },
    { tier: "Enterprise", minVolume: "$500K+", maxVolume: "∞", percentage: "1.5%", flatFee: "$0.15" }
  ]

  const handleSaveGlobalFees = () => {
    console.log('Saving global fees:', globalFees)
    setEditingGlobal(false)
    toast({
      title: "Global fees updated",
      description: "Default fee structure has been saved successfully.",
    })
  }

  const handleToggleCustomFees = (merchantId: string, enabled: boolean) => {
    console.log(`Toggling custom fees for ${merchantId}:`, enabled)
    toast({
      title: enabled ? "Custom fees enabled" : "Custom fees disabled",
      description: `Merchant will ${enabled ? 'use custom' : 'use global'} fee structure.`,
    })
  }

  const calculateFeePreview = (amount: string, percentage: string, flatFee: string) => {
    const amt = parseFloat(amount) || 0
    const pct = parseFloat(percentage) || 0
    const flat = parseFloat(flatFee) || 0
    const percentageFee = (amt * pct) / 100
    const totalFee = percentageFee + flat
    return {
      percentageFee: percentageFee.toFixed(2),
      flatFee: flat.toFixed(2),
      totalFee: totalFee.toFixed(2),
      merchantReceives: (amt - totalFee).toFixed(2)
    }
  }

  const samplePreview = calculateFeePreview("100", globalFees.percentage, globalFees.flatFee)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Configuration</h1>
        <p className="text-muted-foreground">
          Configure global and per-merchant fee structures for payment processing
        </p>
      </div>

      {/* Global Fee Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Global Fee Structure
            </CardTitle>
            <CardDescription>
              Default fees applied to all merchants without custom rates
            </CardDescription>
          </div>
          <Button 
            variant={editingGlobal ? "default" : "outline"}
            onClick={() => editingGlobal ? handleSaveGlobalFees() : setEditingGlobal(true)}
            data-testid={editingGlobal ? "button-save-global-fees" : "button-edit-global-fees"}
          >
            {editingGlobal ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {editingGlobal ? "Save Changes" : "Edit Fees"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage Fee (%)</Label>
              <div className="relative">
                <Input
                  id="percentage"
                  type="number"
                  step="0.1"
                  value={globalFees.percentage}
                  onChange={(e) => setGlobalFees(prev => ({ ...prev, percentage: e.target.value }))}
                  disabled={!editingGlobal}
                  className="pr-8"
                  data-testid="input-global-percentage"
                />
                <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="flatFee">Flat Fee</Label>
              <div className="relative">
                <Input
                  id="flatFee"
                  type="number"
                  step="0.01"
                  value={globalFees.flatFee}
                  onChange={(e) => setGlobalFees(prev => ({ ...prev, flatFee: e.target.value }))}
                  disabled={!editingGlobal}
                  className="pl-8"
                  data-testid="input-global-flat-fee"
                />
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={globalFees.currency} 
                onValueChange={(value) => setGlobalFees(prev => ({ ...prev, currency: value }))}
                disabled={!editingGlobal}
              >
                <SelectTrigger data-testid="select-global-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fee Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-3">Fee Preview (on $100 transaction)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Percentage Fee</p>
                <p className="font-mono font-bold">${samplePreview.percentageFee}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Flat Fee</p>
                <p className="font-mono font-bold">${samplePreview.flatFee}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Fee</p>
                <p className="font-mono font-bold text-red-600">${samplePreview.totalFee}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Merchant Receives</p>
                <p className="font-mono font-bold text-green-600">${samplePreview.merchantReceives}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Volume-Based Tiers</CardTitle>
          <CardDescription>
            Automatic fee reductions based on monthly transaction volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Volume Range</TableHead>
                  <TableHead>Percentage Fee</TableHead>
                  <TableHead>Flat Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volumeTiers.map((tier) => (
                  <TableRow key={tier.tier}>
                    <TableCell>
                      <Badge variant={tier.tier === 'Enterprise' ? 'default' : 'secondary'}>
                        {tier.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {tier.minVolume} - {tier.maxVolume}
                    </TableCell>
                    <TableCell className="font-mono">{tier.percentage}</TableCell>
                    <TableCell className="font-mono">{tier.flatFee}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Merchant-Specific Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant-Specific Fees</CardTitle>
          <CardDescription>
            Custom fee structures for individual merchants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Custom Fees</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Flat Fee</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantFees.map((merchant) => (
                  <TableRow key={merchant.id} data-testid={`row-merchant-fee-${merchant.id}`}>
                    <TableCell>
                      <div className="font-medium">{merchant.name}</div>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={merchant.customFees}
                        onCheckedChange={(checked) => handleToggleCustomFees(merchant.id, checked)}
                        data-testid={`switch-custom-fees-${merchant.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{merchant.percentage}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">${merchant.flatFee}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{merchant.volume}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(merchant.effectiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-edit-merchant-fee-${merchant.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Fee Changes
          </CardTitle>
          <CardDescription>
            Upcoming fee modifications with effective dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`scheduled-change-${change.id}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{change.merchant}</span>
                    <Badge variant="outline">{change.reason}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {change.currentFee} → {change.newFee} effective {new Date(change.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Scheduled</Badge>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}