import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Info, 
  X, 
  Database, 
  Settings, 
  ExternalLink, 
  CheckCircle,
  AlertTriangle,
  Code
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ConfigNotice() {
  const { isSupabaseConfigured } = useAuth();
  const [isDismissed, setIsDismissed] = useState(
    localStorage.getItem('config-notice-dismissed') === 'true'
  );

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('config-notice-dismissed', 'true');
  };

  if (isDismissed || isSupabaseConfigured) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="border-amber-200 bg-amber-50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-semibold text-amber-900">
                Development Mode
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-amber-800">
            Using mock authentication for development
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-start space-x-2 text-sm text-amber-800">
              <Code className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Mock Authentication Active</p>
                <p className="text-xs text-amber-700">
                  All authentication is simulated. Use any email/password to test.
                </p>
              </div>
            </div>
            
            <div className="bg-amber-100 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Email: demo@itrbuddy.com</p>
              <p>Password: Demo123!</p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-medium text-amber-900">To enable Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-800">
                <li>Create a Supabase project</li>
                <li>Add environment variables to .env.local</li>
                <li>Check SUPABASE_SETUP.md for details</li>
              </ol>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => window.open('https://supabase.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Supabase
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthModeIndicator() {
  const { isSupabaseConfigured } = useAuth();

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isSupabaseConfigured 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-amber-100 text-amber-800 border border-amber-200'
      }`}>
        {isSupabaseConfigured ? (
          <>
            <Database className="h-3 w-3 mr-1" />
            Supabase Connected
          </>
        ) : (
          <>
            <Code className="h-3 w-3 mr-1" />
            Mock Auth
          </>
        )}
      </div>
    </div>
  );
}

export default ConfigNotice;
