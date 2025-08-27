import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, MessageSquare, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

export default function Register() {
  const benefits = [
    "Free basic tax return filing",
    "AI-powered deduction finder",
    "Maximum refund guarantee",
    "Expert support when needed"
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Benefits Column */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Join ITR Buddy Today
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Start your journey to smarter tax filing with our AI-powered platform.
            </p>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Registration Form Column */}
          <div className="order-1 lg:order-2">
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">Registration Page</CardTitle>
                <CardDescription>
                  This page is ready to be customized for user registration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">
                    This is a placeholder page. Continue prompting to have me add the registration form, validation, and user onboarding flow.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Add Registration Form
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Add Email Verification
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Add Onboarding Flow
                    </Button>
                  </div>
                </div>
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                      Login here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
