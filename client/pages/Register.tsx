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
import { UserPlus, CheckCircle, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { registrationSchema, type RegistrationFormData, getPasswordStrength } from "@/lib/validations";

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = form.watch("password");
  const passwordStrength = watchedPassword ? getPasswordStrength(watchedPassword) : null;

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // For demo purposes, simulate registration success
      console.log("Registration data:", data);
      
      setSuccess("Account created successfully! Redirecting to login...");
      
      // Redirect to login after success
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    "Free basic tax return filing",
    "AI-powered deduction finder",
    "Maximum refund guarantee",
    "Expert support when needed",
    "Bank-level security protection",
    "Mobile access anywhere"
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Benefits Column */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Join ITR Buddy Today
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Start your journey to smarter tax filing with our AI-powered platform. Join over 50,000 users who trust us with their tax returns.
            </p>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-brand-50 rounded-lg">
              <p className="text-sm text-brand-800">
                <strong>🔒 Secure & Trusted:</strong> Your data is protected with enterprise-grade encryption. We never share your personal information.
              </p>
            </div>
          </div>

          {/* Registration Form Column */}
          <div className="order-1 lg:order-2">
            <Card className="w-full shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">Create Your Account</CardTitle>
                <CardDescription>
                  Start filing your taxes with confidence
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
                    {/* Full Name Field */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                              className="h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                {...field}
                                className="h-12 pr-10"
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
                          {/* Password Strength Indicator */}
                          {watchedPassword && passwordStrength && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Password Strength:</span>
                                <span className={passwordStrength.color}>
                                  {passwordStrength.label}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    passwordStrength.score >= 4
                                      ? "bg-green-500"
                                      : passwordStrength.score >= 3
                                      ? "bg-blue-500"
                                      : passwordStrength.score >= 2
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Confirm Password Field */}
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                {...field}
                                className="h-12 pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
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

                    {/* Submit Buttons */}
                    <div className="space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                      
                      <Link to="/login">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full h-12 text-base"
                          disabled={isLoading}
                        >
                          Back to Login
                        </Button>
                      </Link>
                    </div>

                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                          Login here
                        </Link>
                      </p>
                    </div>

                    <div className="text-center pt-2">
                      <p className="text-xs text-gray-500">
                        By creating an account, you agree to our{" "}
                        <a href="#" className="text-brand-600 hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-brand-600 hover:underline">
                          Privacy Policy
                        </a>
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
