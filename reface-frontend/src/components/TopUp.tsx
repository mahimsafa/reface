import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Zap, Star, Check, Loader } from 'lucide-react';
import { api } from '../lib/api';

const TopUp: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['creditPackages'],
    queryFn: api.getCreditPackages,
  });

  const { data: creditsInfo } = useQuery({
    queryKey: ['creditsInfo'],
    queryFn: api.getCreditsInfo,
  });

  const purchaseMutation = useMutation({
    mutationFn: api.purchaseCredits,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditsInfo'] });
    },
  });

  const handlePurchase = (packageId: string) => {
    purchaseMutation.mutate(packageId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading credit packages...</p>
        </div>
      </div>
    );
  }

  const packages = packagesData?.data || [];
  const credits = creditsInfo?.data || { remaining: 0, todayUsed: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Top Up Credits</h1>
          <p className="text-lg text-gray-600">Choose a credit package to continue face swapping</p>
        </div>

        {/* Current Credits */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{credits.remaining.toLocaleString()}</span>
              </div>
              <p className="text-gray-600">Credits Remaining</p>
            </div>
            <div className="h-12 w-px bg-gray-300" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CreditCard className="w-6 h-6 text-orange-600" />
                <span className="text-2xl font-bold text-gray-900">{credits.todayUsed}</span>
              </div>
              <p className="text-gray-600">Used Today</p>
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl ${
                pkg.popular ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">${pkg.price}</span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">{pkg.credits.toLocaleString()}</span>
                  </div>
                  <p className="text-gray-600">Credits</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>High-quality face swaps</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Fast processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>24/7 support</span>
                  </div>
                  {pkg.credits >= 500 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Priority processing</span>
                    </div>
                  )}
                  {pkg.credits >= 1000 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>API access</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseMutation.isPending}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {purchaseMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Purchase Credits'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Success Message */}
        {purchaseMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-900 mb-2">Purchase Successful!</h3>
              <p className="text-green-700">
                {purchaseMutation.data?.data.credits} credits have been added to your account.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {purchaseMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="text-center">
              <p className="text-red-700">
                Purchase failed. Please try again or contact support.
              </p>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">How do credits work?</h4>
              <p className="text-gray-600 mb-4">
                Each face swap operation consumes credits based on the complexity and processing time. 
                Simple swaps typically use 1-5 credits.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Do credits expire?</h4>
              <p className="text-gray-600 mb-4">
                No, your credits never expire. You can use them whenever you need to process face swaps.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Can I get a refund?</h4>
              <p className="text-gray-600 mb-4">
                We offer refunds within 30 days of purchase for unused credits. Contact our support team for assistance.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Is my payment secure?</h4>
              <p className="text-gray-600 mb-4">
                Yes, all payments are processed securely using industry-standard encryption and security measures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopUp;