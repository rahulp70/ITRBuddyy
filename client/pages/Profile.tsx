import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  const { user, profile, updateProfile, isLoading } = useAuth();
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateProfile({ full_name: fullName });
      if (res?.error) {
        setMessage((res.error as any)?.message || "Failed to update profile");
      } else {
        setMessage("Profile updated");
      }
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 text-sm text-gray-600">{user?.email}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <div className="mt-1">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              {message && (
                <div className="text-sm text-gray-700">{message}</div>
              )}

              <div className="pt-4">
                <Button onClick={onSave} disabled={saving || isLoading}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
