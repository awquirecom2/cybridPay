import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Mail, ArrowLeft, Key, Check } from "lucide-react";
import { z } from "zod";

// Schema for password reset request
const resetRequestSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
});

// Schema for password reset (with token)
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetRequest = z.infer<typeof resetRequestSchema>;
type ResetPassword = z.infer<typeof resetPasswordSchema>;

export default function AdminPasswordReset() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [resetToken, setResetToken] = useState('');

  // Check URL for reset token
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');

  const requestForm = useForm<ResetRequest>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      identifier: '',
    },
  });

  const resetForm = useForm<ResetPassword>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl || '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  // If we have a token in the URL, go directly to reset step
  useEffect(() => {
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      resetForm.setValue('token', tokenFromUrl);
      setStep('reset');
    }
  }, [tokenFromUrl]);

  const requestResetMutation = useMutation({
    mutationFn: async (data: ResetRequest) => {
      const response = await apiRequest('POST', '/api/admin/request-password-reset', data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.resetToken) {
        // Development mode - we get the token directly
        setResetToken(data.resetToken);
        resetForm.setValue('token', data.resetToken);
        setStep('reset');
        toast({
          title: "Reset token generated",
          description: "Token generated successfully. You can now reset your password.",
        });
      } else {
        // Production mode - token sent via email
        toast({
          title: "Reset request sent",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "Failed to request password reset",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPassword) => {
      const response = await apiRequest('POST', '/api/admin/reset-password', {
        token: data.token,
        newPassword: data.newPassword,
      });
      return await response.json();
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Failed to reset password",
      });
    },
  });

  const onRequestSubmit = (data: ResetRequest) => {
    requestResetMutation.mutate(data);
  };

  const onResetSubmit = (data: ResetPassword) => {
    resetPasswordMutation.mutate(data);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Password Reset Complete</h1>
            <p className="text-muted-foreground mt-2">
              Your admin password has been successfully reset
            </p>
          </div>

          <Card className="w-full shadow-lg">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button
                onClick={() => setLocation('/admin/login')}
                className="w-full"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Key className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground mt-2">
              Enter your new admin password
            </p>
          </div>

          <Card className="w-full shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">New Password</CardTitle>
              <CardDescription className="text-center">
                Choose a strong password for your admin account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reset Token</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter reset token"
                            data-testid="input-reset-token"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            data-testid="input-new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm new password"
                            data-testid="input-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/admin/login')}
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Request step
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            Reset your admin account password
          </p>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Password Reset</CardTitle>
            <CardDescription className="text-center">
              Enter your username or email to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter username or email"
                            className="pl-10"
                            data-testid="input-identifier"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestResetMutation.isPending}
                  data-testid="button-request-reset"
                >
                  {requestResetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/admin/login')}
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}