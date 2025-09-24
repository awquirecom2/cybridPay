import { useQuery } from "@tanstack/react-query"

interface MerchantProfile {
  id: string
  name: string
  email: string
  username: string
  businessType?: string
  website?: string
  phone?: string
  address?: string
  description?: string
  status: string
  kybStatus: string
  customFeeEnabled?: boolean
  customFeePercentage?: string
  customFlatFee?: string
  payoutMethod?: string
  bankAccountNumber?: string
  bankRoutingNumber?: string
  notes?: string
  volume?: string
  integrations?: string[]
  cybridCustomerGuid?: string
  cybridCustomerType?: string
  cybridVerificationGuid?: string
  cybridIntegrationStatus?: string
  cybridLastError?: string
  cybridLastAttemptAt?: string
  cybridLastSyncedAt?: string
  depositAddressesCreated?: boolean
  cybridTradeAccountGuid?: string
  tradeAccountStatus?: string
  tradeAccountAsset?: string
  tradeAccountCreatedAt?: string
  depositAddressGuid?: string
  depositAddress?: string
  depositAddressStatus?: string
  depositAddressAsset?: string
  depositAddressCreatedAt?: string
  dateOnboarded?: string
  createdAt?: string
  updatedAt?: string
}

export function useMerchantProfile() {
  const query = useQuery<MerchantProfile>({
    queryKey: ['/api/merchant/profile'],
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (user not authenticated)
      if (error?.status === 401) {
        return false
      }
      return failureCount < 2
    }
  })

  // Compute KYC completion status
  const isKycComplete = query.data ? (
    query.data.kybStatus === 'verified' && 
    !!query.data.cybridCustomerGuid
  ) : false

  const kycStatus = {
    isComplete: isKycComplete,
    status: query.data?.kybStatus || 'unknown',
    hasCustomerGuid: !!query.data?.cybridCustomerGuid,
    integrationStatus: query.data?.cybridIntegrationStatus || 'pending'
  }

  return {
    ...query,
    merchant: query.data,
    isKycComplete,
    kycStatus
  }
}