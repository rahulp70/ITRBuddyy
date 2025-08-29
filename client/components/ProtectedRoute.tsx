import { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from './Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(true);

  // Show loader for at least 500ms to prevent flashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while auth is being determined
  if (isLoading || showLoader) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-600" />
            <p className="text-gray-600">Verifying authentication...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If authentication is not required but user is authenticated (e.g., login/register pages)
  if (!requireAuth && isAuthenticated) {
    // Get the intended destination from location state, or default to dashboard
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // User has appropriate access
  return <>{children}</>;
}

// Higher-order component for easy usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireAuth?: boolean; redirectTo?: string }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for checking specific permissions
export function useRequireAuth() {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    user,
    isLoading,
    requireAuth: (redirectTo = '/login') => {
      if (!isLoading && !isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
      }
      return null;
    }
  };
}

export default ProtectedRoute;
