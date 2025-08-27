import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp, Shield, Clock, Calculator, FileText, Bot, Zap } from "lucide-react";
import Layout from "@/components/Layout";

export default function Index() {
  const features = [
    {
      icon: <Bot className="h-8 w-8 text-brand-600" />,
      title: "AI-Powered Assistant",
      description: "Smart automation that understands tax rules and helps you maximize deductions with confidence."
    },
    {
      icon: <Calculator className="h-8 w-8 text-brand-600" />,
      title: "Accurate Calculations",
      description: "Advanced algorithms ensure precise tax calculations and compliance with current tax laws."
    },
    {
      icon: <Clock className="h-8 w-8 text-brand-600" />,
      title: "Save Time",
      description: "Complete your tax return in minutes, not hours. Our AI handles the complex work for you."
    },
    {
      icon: <Shield className="h-8 w-8 text-brand-600" />,
      title: "Bank-Level Security",
      description: "Your financial data is protected with enterprise-grade encryption and security measures."
    },
    {
      icon: <FileText className="h-8 w-8 text-brand-600" />,
      title: "Document Management",
      description: "Automatically import and organize tax documents from multiple sources seamlessly."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-brand-600" />,
      title: "Tax Optimization",
      description: "Identify opportunities to minimize your tax liability and maximize your refund legally."
    }
  ];

  const benefits = [
    "Free basic tax return filing",
    "Expert review of complex returns",
    "Maximum refund guarantee",
    "Audit protection and support",
    "Year-round tax planning advice",
    "Mobile app for on-the-go access"
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800 mb-6">
                <Zap className="w-4 h-4 mr-2" />
                AI-Powered Tax Assistant
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                File Your Taxes with
                <span className="text-brand-600"> AI Confidence</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                ITR Buddy makes tax filing simple, accurate, and stress-free. Our AI assistant guides you through every step, ensuring maximum deductions and compliance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-3">
                    Get Started Free
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-3">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center mt-6 text-sm text-gray-600">
                <CheckCircle className="w-5 h-5 text-success-600 mr-2" />
                Free for simple returns • No hidden fees • 100% secure
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2">
                <div className="bg-brand-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center mr-3">
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Tax Calculation</h3>
                      <p className="text-sm text-gray-600">AI Processing...</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Income:</span>
                      <span className="font-semibold">₹8,50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deductions:</span>
                      <span className="font-semibold text-success-600">₹2,50,000</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Tax Payable:</span>
                      <span className="font-bold text-lg">₹75,000</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-success-500 text-white p-4 rounded-lg shadow-lg transform -rotate-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Saved ₹25,000!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ITR Buddy?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of tax filing with our intelligent platform designed to make your life easier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Everything You Need for Tax Success
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of satisfied users who trust ITR Buddy for their tax filing needs. Our comprehensive platform offers everything from basic returns to complex tax situations.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-success-600 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
                    <TrendingUp className="w-8 h-8 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Average Refund Increase</h3>
                  <div className="text-4xl font-bold text-success-600">₹18,500</div>
                  <p className="text-gray-600">vs. manual filing</p>
                </div>
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Processing Speed</span>
                    <span className="font-semibold">10x Faster</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Accuracy Rate</span>
                    <span className="font-semibold">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold">4.9/5 ⭐</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Simplify Your Tax Filing?
          </h2>
          <p className="text-xl text-brand-100 mb-8">
            Join over 50,000 users who have already discovered the easiest way to file their taxes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-3">
                Start Your Return
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-brand-600">
              Contact Sales
            </Button>
          </div>
          <p className="text-brand-200 text-sm mt-6">
            No credit card required • Free for simple returns • Expert support included
          </p>
        </div>
      </section>
    </Layout>
  );
}
