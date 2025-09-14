import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  userType: "admin" | "merchant"
}

export function ProtectedRoute({ children, userType }: ProtectedRouteProps) {
  const [, setLocation] = useLocation()

  // Check authentication status
  const { data: profile, isLoading, error } = useQuery({
    queryKey: userType === "admin" ? ['/api/admin/profile'] : ['/api/merchant/profile'],
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch to ensure fresh auth state
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && (!profile || error)) {
      const loginPath = userType === "admin" ? "/admin/login" : "/merchant/login"
      setLocation(loginPath)
    }
  }, [profile, isLoading, error, userType, setLocation])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">
          Verifying authentication...
        </div>
      </div>
    )
  }

  // Only render protected content if authenticated
  if (profile) {
    return <>{children}</>
  }

  // Return null while redirecting (prevents flash of protected content)
  return null
}

// Wrapper components for easier use
export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute userType="admin">{children}</ProtectedRoute>
}

export function MerchantProtectedRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute userType="merchant">{children}</ProtectedRoute>
}