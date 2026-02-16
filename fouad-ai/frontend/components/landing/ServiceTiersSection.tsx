import { Target, Lock, Banknote, Check, X, ArrowRight, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ServiceTiersSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Choose Your Protection Level
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            From basic coordination to full financial custody—select the service tier that matches
            your risk tolerance and deal complexity
          </p>
        </div>

        {/* Service Tier Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Tier 1 - Governance Advisory */}
          <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 bg-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Governance Advisory
              </h3>
              <p className="text-sm text-slate-600 italic">
                You control everything, we verify everything
              </p>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">What's included:</div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>AI-powered milestone tracking</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Evidence verification & classification</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Complete audit trail</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Email notifications</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Dispute mediation</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">What's NOT included:</div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>No document custody</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>No financial custody</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>No fiduciary responsibility</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="text-lg font-medium text-slate-900 mb-2">
                From 0.5%
              </div>
              <div className="text-xs text-slate-500">Minimum 5,000 EGP</div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-2">Best for:</div>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Established business relationships</li>
                <li>• Deals under 1M EGP</li>
                <li>• Partners with existing trust</li>
                <li>• Quick transactions</li>
              </ul>
            </div>

            <div className="mt-auto">
              <Button asChild className="w-full" variant="outline">
                <Link href="/deals/new?tier=governance">Start Deal</Link>
              </Button>
            </div>
          </Card>

          {/* Tier 2 - Document Custody (FEATURED) */}
          <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-4 border-purple-300 bg-gradient-to-b from-purple-50 to-white relative flex flex-col scale-105 lg:scale-110">
            {/* Most Popular Badge */}
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-1.5 text-sm font-semibold shadow-lg">
              <Crown className="w-4 h-4 mr-1 inline" />
              Most Popular
            </Badge>

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Document Custody
              </h3>
              <p className="text-sm text-purple-700 italic font-medium">
                We secure your title deeds and critical documents
              </p>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">What's included:</div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">All Tier 1 features</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Physical vault document storage</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Title deed & certificate custody</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Digital twin creation</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Blockchain-anchored proof</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Insurance coverage</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">What's NOT included:</div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>No financial custody (parties move money themselves)</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="text-lg font-medium text-purple-700 mb-2">
                From 0.75-1%
              </div>
              <div className="text-xs text-slate-500">+ storage fee</div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-2">Best for:</div>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Real estate transactions</li>
                <li>• Share transfers</li>
                <li>• High-value asset sales</li>
                <li>• Deals requiring document security</li>
              </ul>
            </div>

            <div className="mt-auto">
              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">
                <Link href="/deals/new?tier=document">
                  Start Deal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Tier 3 - Financial Escrow */}
          <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 hover:border-amber-200 bg-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Banknote className="w-8 h-8 text-amber-600" />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Financial Escrow
              </h3>
              <p className="text-sm text-slate-600 italic">
                Complete financial custody and fiduciary responsibility
              </p>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">What's included:</div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">All Tier 1 & 2 features</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Segregated escrow accounts</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Fund custody and disbursement</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Guarantor cheque holding</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Multi-signature approvals</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full regulatory compliance</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Bonded and insured</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="text-lg font-medium text-slate-900 mb-2">
                From 1.5-3%
              </div>
              <div className="text-xs text-slate-500">Minimum 25,000 EGP</div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 mb-2">Best for:</div>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Deals over 5M EGP</li>
                <li>• Cross-border transactions</li>
                <li>• Government contracts</li>
                <li>• Maximum risk mitigation</li>
                <li>• Complete peace of mind</li>
              </ul>
            </div>

            <div className="mt-auto">
              <Button asChild className="w-full" variant="outline">
                <Link href="/deals/new?tier=escrow">Start Deal</Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-16">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
            <p className="text-slate-700 mb-2">
              <span className="font-semibold">Need help choosing?</span> Our team can recommend
              the best tier based on your transaction details.
            </p>
            <Button asChild variant="link" className="text-blue-600">
              <Link href="/contact">
                Contact Us
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
