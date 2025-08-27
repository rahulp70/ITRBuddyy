import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { error: authError } = await resetPassword(data.email);
      
      if (authError) {
        // Handle specific error messages
        if (authError.message.includes('User not found')) {
          setError("No account found with this email address. Please check your email or create a new account.");
        } else if (authError.message.includes('Email rate limit exceeded')) {
          setError("Too many password reset requests. Please wait a few minutes before trying again.");
        } else {
          setError(authError.message || "Failed to send reset instructions. Please try again.");
        }
        return;
      }

      setSuccess("Password reset instructions have been sent to your email address. Please check your inbox and follow the instructions to reset your password.");
      
      // Clear the form
      form.reset();
      
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Information Column */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Reset Your Password
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Don't worry, it happens to the best of us. Enter your email address and we'll send you secure instructions to reset your password.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Secure password reset process</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Email verification required</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                <span className="text-gray-700">One-time reset link expires in 1 hour</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Account remains secure during reset</span>
              </div>
            </div>

            <div className="bg-brand-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <Shield className="w-6 h-6 text-brand-600 mr-2" />
                <h3 className="font-semibold text-brand-900">Security Notice</h3>
              </div>
              <p className="text-sm text-brand-800">
                For your security, password reset links are only valid for 1 hour and can only be used once. If you don't receive an email, please check your spam folder.
              </p>
            </div>
          </div>

          {/* Reset Form Column */}
          <div className="order-1 lg:order-2">
            <Card className="w-full shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you secure reset instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="mb-6 border-success-200 bg-success-50">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                    <AlertDescription className="text-success-800">{success}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email address"
                              {...field}
                              className="h-12"
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base" 
                      disabled={isSubmitting || success !== ""}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Instructions...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Reset Instructions
                        </>
                      )}
                    </Button>

                    <Link to="/login">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-12 text-base"
                        disabled={isSubmitting}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                      </Button>
                    </Link>

                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-600">
                        Remember your password?{" "}
                        <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                          Login here
                        </Link>
                      </p>
                    </div>

                    <div className="text-center pt-2">
                      <p className="text-xs text-gray-500">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                          Sign up here
                        </Link>
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
