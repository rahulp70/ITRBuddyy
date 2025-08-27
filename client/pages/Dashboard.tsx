import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  FileText, 
  Calculator, 
  TrendingUp, 
  Clock, 
  User, 
  Mail, 
  Calendar,
  Shield,
  LogOut,
  Settings,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

function DashboardContent() {
  const { user, profile, signOut, isLoading, isSupabaseConfigured } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const quickStats = [
    {
      icon: <FileText className="w-6 h-6 text-brand-600" />,
      title: "Tax Returns",
      value: "2024",
      description: "Current year",
      status: "active"
    },
    {
      icon: <Calculator className="w-6 h-6 text-success-600" />,
      title: "Estimated Refund",
      value: "₹25,000",
      description: "Based on current data",
      status: "estimated"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      title: "Completion",
      value: "15%",
      description: "Getting started",
      status: "in-progress"
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      title: "Time Saved",
      value: "2.5 hrs",
      description: "With AI assistance",
      status: "saved"
    }
  ];

  const recentActivity = [
    {
      action: "Account created",
      timestamp: "Just now",
      status: "success"
    },
    {
      action: "Profile setup initiated",
      timestamp: "1 minute ago",
      status: "in-progress"
    },
    {
      action: "Welcome email sent",
      timestamp: "2 minutes ago",
      status: "success"
    }
  ];

  const nextSteps = [
    {
      title: "Complete Profile Setup",
      description: "Add your personal and financial information",
      action: "Complete Setup",
      priority: "high"
    },
    {
      title: "Upload Tax Documents",
      description: "Import W-2s, 1099s, and other tax forms",
      action: "Upload Documents",
      priority: "medium"
    },
    {
      title: "Review Deductions",
      description: "Let AI find potential tax savings",
      action: "Find Deductions",
      priority: "medium"
    },
    {
      title: "File Your Return",
      description: "Submit your completed tax return",
      action: "File Return",
      priority: "low"
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with User Info */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-brand-100 text-brand-600 text-lg font-semibold">
                  {profile?.full_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {profile?.full_name || user?.user_metadata?.full_name || 'User'}!
                </h1>
                <p className="text-gray-600 flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {user?.email}
                  {user?.email_confirmed_at && (
                    <CheckCircle className="w-4 h-4 ml-2 text-success-600" />
                  )}
                </p>
                <div className="flex items-center mt-2 space-x-4">
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified Account
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Member since {new Date(user?.created_at || '').toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Next Steps */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-brand-600" />
                  Next Steps
                </CardTitle>
                <CardDescription>
                  Complete these steps to maximize your tax refund
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nextSteps.map((step, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="font-semibold text-gray-900">{step.title}</h3>
                          <Badge 
                            variant={step.priority === 'high' ? 'destructive' : step.priority === 'medium' ? 'default' : 'secondary'}
                            className="ml-2 text-xs"
                          >
                            {step.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        {step.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-brand-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-success-500' : 
                        activity.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calculator className="w-4 h-4 mr-2" />
                    Tax Calculator
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Forms
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <User className="w-4 h-4 mr-2" />
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Authentication Mode Info */}
        {!isSupabaseConfigured && (
          <Alert className="mt-8 border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Development Mode:</strong> You're logged in with mock authentication. All data is simulated and stored locally.
              Connect Supabase for real database integration and persistent user accounts.
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Alert for New Users */}
        {user && !profile?.avatar_url && isSupabaseConfigured && (
          <Alert className="mt-8 border-brand-200 bg-brand-50">
            <CheckCircle className="h-4 w-4 text-brand-600" />
            <AlertDescription className="text-brand-800">
              <strong>Welcome to ITR Buddy!</strong> Your account has been successfully created and you're now logged in with secure JWT authentication.
              Complete your profile setup to get personalized tax recommendations.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Layout>
      <ProtectedRoute requireAuth={true}>
        <DashboardContent />
      </ProtectedRoute>
    </Layout>
  );
}
