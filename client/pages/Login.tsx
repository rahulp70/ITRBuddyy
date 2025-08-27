import { Link, useNavigate } from "react-router-dom";
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
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, LockKeyhole } from "lucide-react";
import Layout from "@/components/Layout";
import { loginSchema, type LoginFormData } from "@/lib/validations";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // For demo purposes, simulate different login scenarios
      if (data.email === "demo@itrbuddy.com" && data.password === "Demo123!") {
        setSuccess("Login successful! Redirecting to dashboard...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else if (data.email === "test@example.com") {
        setError("Account not found. Please check your email address.");
      } else if (data.password.length < 6) {
        setError("Invalid password. Please check your password and try again.");
      } else {
        // Generic success for demo
        console.log("Login data:", data);
        setSuccess("Login successful! Redirecting to dashboard...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
      
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Secure authentication with 2FA support",
    "Access your tax returns from anywhere",
    "Real-time sync across all devices",
    "Expert support when you need it"
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Welcome Column */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Welcome Back to ITR Buddy
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Access your tax filing dashboard and continue where you left off. Your AI tax assistant is ready to help you maximize your refund.
            </p>
            
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-brand-50 rounded-lg p-6">
              <h3 className="font-semibold text-brand-900 mb-2">Demo Account</h3>
              <p className="text-sm text-brand-800 mb-3">
                Try ITR Buddy with our demo account:
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> demo@itrbuddy.com</p>
                <p><strong>Password:</strong> Demo123!</p>
              </div>
            </div>
          </div>

          {/* Login Form Column */}
          <div className="order-1 lg:order-2">
            <Card className="w-full shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <LogIn className="w-6 h-6 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">Login to Your Account</CardTitle>
                <CardDescription>
                  Continue your tax filing journey
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
                    {/* Email Field */}
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

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <Link 
                              to="/forgot-password" 
                              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                              Forgot Password?
                            </Link>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                {...field}
                                className="h-12 pr-10"
                                autoComplete="current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Login
                        </>
                      )}
                    </Button>

                    {/* Register Link */}
                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-600">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                          Create one here
                        </Link>
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">
                          Need Help?
                        </span>
                      </div>
                    </div>

                    {/* Help Links */}
                    <div className="grid grid-cols-2 gap-4">
                      <Link to="/forgot-password">
                        <Button variant="outline" size="sm" className="w-full h-10">
                          <LockKeyhole className="mr-2 h-4 w-4" />
                          Reset Password
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button variant="outline" size="sm" className="w-full h-10">
                          Register
                        </Button>
                      </Link>
                    </div>

                    <div className="text-center pt-2">
                      <p className="text-xs text-gray-500">
                        Secure login protected by enterprise-grade encryption
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
