import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, MessageSquare, FileText, Calculator, TrendingUp, Clock } from "lucide-react";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const quickStats = [
    {
      icon: <FileText className="w-6 h-6 text-brand-600" />,
      title: "Tax Returns",
      value: "2024",
      description: "Current year"
    },
    {
      icon: <Calculator className="w-6 h-6 text-success-600" />,
      title: "Estimated Refund",
      value: "₹25,000",
      description: "Based on current data"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      title: "Completion",
      value: "0%",
      description: "Ready to start"
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      title: "Time Saved",
      value: "0 hrs",
      description: "So far this year"
    }
  ];

  const features = [
    "Tax Return Overview",
    "Document Upload Center",
    "Deduction Tracker",
    "Refund Calculator",
    "Tax Calendar",
    "Expert Chat Support"
  ];

  return (
    <Layout>
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome to your tax filing command center</p>
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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Placeholder Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-brand-600" />
                </div>
                <CardTitle className="text-2xl">Dashboard Content</CardTitle>
                <CardDescription>
                  This is a placeholder dashboard. Continue prompting to customize the interface and functionality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    This dashboard is ready to be customized with your specific tax filing features. 
                    Tell me what functionality you'd like to add, and I'll build it for you.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {features.map((feature, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border">
                        <p className="font-medium text-gray-900 mb-2">{feature}</p>
                        <Button variant="outline" size="sm" className="w-full">
                          Add Feature
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button size="lg" className="w-full md:w-auto">
                      Start Your Tax Return
                    </Button>
                    <p className="text-sm text-gray-500">
                      Or continue prompting to customize this dashboard with specific features
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
