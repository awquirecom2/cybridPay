import { QueryClient, QueryFunction } from "@tanstack/react-query";

let kycRequiredShown = false; // Simple deduplication for KYC warnings

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 403 KYC_REQUIRED responses
    if (res.status === 403) {
      try {
        const errorData = await res.json();
        if (errorData.code === 'KYC_REQUIRED' && !kycRequiredShown) {
          kycRequiredShown = true;
          // Reset flag after 3 seconds to allow new handling if needed
          setTimeout(() => { kycRequiredShown = false; }, 3000);
          
          console.warn('KYC verification required:', errorData.message);
          
          // Check if user has dismissed this warning in this session
          const dismissedKey = 'kyc_warning_dismissed';
          const isDismissed = sessionStorage.getItem(dismissedKey) === 'true';
          
          if (!isDismissed) {
            // Emit custom event for UI components to catch and show dismissible warning
            const event = new CustomEvent('kycWarningRequired', {
              detail: {
                message: errorData.message || 'Identity verification is required to access all features',
                onboardingUrl: '/merchant/kyb-onboarding'
              }
            });
            window.dispatchEvent(event);
          }
        }
        throw new Error(`${res.status}: ${errorData.error || errorData.message || 'KYB verification required'}`);
      } catch (jsonError) {
        // If JSON parsing fails, fall through to default error handling
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
    } else {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
