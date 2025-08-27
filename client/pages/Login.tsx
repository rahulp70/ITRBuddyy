import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";

export default function Login() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
              <ArrowRight className="w-6 h-6 text-brand-600" />
            </div>
            <CardTitle className="text-2xl">Login Page</CardTitle>
            <CardDescription>
              This page is ready to be customized for your login functionality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                This is a placeholder page. Continue prompting to have me fill in the login form, authentication logic, and user experience.
              </p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  Add Login Form
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Add Social Auth
                </Button>
              </div>
            </div>
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
