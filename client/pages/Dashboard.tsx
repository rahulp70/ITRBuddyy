import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Calendar, Shield, LogOut, Settings, CheckCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import DocumentManager from "@/components/DocumentManager";
import StatsCards from "@/components/StatsCards";
import ITRRecommendation from "@/components/ITRRecommendation";

function DashboardContent() {
  const { user, profile, signOut, isLoading, isSupabaseConfigured } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };


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

        {/* Document Manager */}
        <DocumentManager className="mb-10" />

        {/* Dynamic Stats */}
        <StatsCards />

        {/* ITR Recommendation */}
        <ITRRecommendation />

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
