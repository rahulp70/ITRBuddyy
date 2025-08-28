import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
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
  Loader2,
  Eye
} from "lucide-react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import DocumentManager from "@/components/DocumentManager";

function DashboardContent() {
  const { user, profile, signOut, isLoading, isSupabaseConfigured } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();

  // Data preview dialog (kept for potential future use)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

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

  const quickStats = [
    {
      icon: <FileText className="w-6 h-6 text-brand-600" />,
      title: "Tax Returns",
      value: "2024",
      description: "Current year",
    },
    {
      icon: <Calculator className="w-6 h-6 text-success-600" />,
      title: "Estimated Refund",
      value: "₹25,000",
      description: "Based on current data",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      title: "Completion",
      value: `${Math.min(100, documents.filter(d=>d.status==='completed').length*20)}%`,
      description: "Progress",
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      title: "Time Saved",
      value: "2.5 hrs",
      description: "With AI assistance",
    }
  ];

  const onFilesUploaded = async (files: File[]) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("upload failed");
        const data = await res.json();
        const doc: Document = {
          id: data.id,
          name: data.name,
          type: data.type,
          size: data.size,
          uploadDate: new Date(),
          status: data.status,
          category: file.name.toLowerCase().includes('form16') ? 'form16' : file.type.startsWith('image/') ? 'investment' : 'other',
        };
        setDocuments((prev) => [doc, ...prev]);
        setFilesById((prev) => ({ ...prev, [doc.id]: file }));

        // Poll status until completed/error
        const poll = async () => {
          try {
            const sres = await fetch(`/api/documents/${doc.id}/status`);
            const sdata = await sres.json();
            setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: sdata.status, error: sdata.error } : d));
            if (sdata.status === 'processing') {
              setTimeout(poll, 800);
            } else if (sdata.status === 'completed') {
              const dres = await fetch(`/api/documents/${doc.id}/data`);
              const djson = await dres.json();
              if (djson.extractedData) {
                setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, extractedData: djson.extractedData } : d));
              }
            }
          } catch {}
        };
        poll();
      } catch (e) {
        const failed: Document = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: new Date(),
          status: 'error',
          error: 'Upload failed',
        } as Document;
        setDocuments((prev) => [failed, ...prev]);
      }
    }
  };

  const onViewData = (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const onViewITRForm = (doc: Document) => {
    navigate(`/itr/review/${doc.id}`);
  };

  const onDownload = (doc: Document) => {
    const file = filesById[doc.id];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setFilesById((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const onReprocess = (id: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'processing', error: undefined } : d)));
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'completed',
                extractedData: d.extractedData || { income: 980000, deductions: 150000, taxableIncome: 830000 },
              }
            : d
        )
      );
    }, 1200);
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

        {/* Document List/Table */}
        <DocumentList
          documents={documents}
          onViewData={onViewData}
          onViewITRForm={onViewITRForm}
          onDownload={onDownload}
          onDelete={onDelete}
          onReprocess={onReprocess}
          className="mb-8"
        />

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

        {/* Data Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center"><Eye className="w-4 h-4 mr-2" /> Extracted Data</DialogTitle>
            </DialogHeader>
            <div className="text-sm">
              {previewDoc?.extractedData ? (
                <div className="space-y-1">
                  <div>Income: ₹{previewDoc.extractedData.income.toLocaleString()}</div>
                  <div>Deductions: ₹{previewDoc.extractedData.deductions.toLocaleString()}</div>
                  <div>Taxable: ₹{previewDoc.extractedData.taxableIncome.toLocaleString()}</div>
                </div>
              ) : (
                <div className="text-gray-500">No extracted data available.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
