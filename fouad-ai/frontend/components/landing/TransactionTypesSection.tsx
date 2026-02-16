import { Zap, Target, CheckCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TransactionTypesSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            How DealGuard Works for Your Deal
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the structure that fits your transaction
          </p>
        </div>

        {/* Transaction Type Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Single-Step Transactions */}
          <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">
                Single-Step Transactions
              </h3>
            </div>

            <p className="text-slate-600 mb-6 leading-relaxed">
              Perfect for straightforward deals where payment and delivery happen together
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Features
                </h4>
                <ul className="space-y-2 ml-7">
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    One payment, one delivery
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    Quick completion
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    Minimal complexity
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    Fast dispute resolution
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Best for:</h4>
                <ul className="space-y-1.5 ml-4">
                  <li className="text-slate-600 text-sm">• Vehicle sales</li>
                  <li className="text-slate-600 text-sm">• Used equipment</li>
                  <li className="text-slate-600 text-sm">• Freelance contracts</li>
                  <li className="text-slate-600 text-sm">• Service agreements</li>
                </ul>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full group">
              <Link href="/single-step-guide">
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </Card>

          {/* Milestone-Based Deals */}
          <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200 bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">
                Milestone-Based Deals
              </h3>
            </div>

            <p className="text-slate-600 mb-6 leading-relaxed">
              For complex deals requiring staged payments tied to performance obligations
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Features
                </h4>
                <ul className="space-y-2 ml-7">
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    Staged payments over time
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    Performance-based releases
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    Custom trigger conditions
                  </li>
                  <li className="text-slate-700 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    Complete transparency
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Best for:</h4>
                <ul className="space-y-1.5 ml-4">
                  <li className="text-slate-600 text-sm">• Real estate transactions</li>
                  <li className="text-slate-600 text-sm">• Share transfers</li>
                  <li className="text-slate-600 text-sm">• Business acquisitions</li>
                  <li className="text-slate-600 text-sm">• Construction projects</li>
                  <li className="text-slate-600 text-sm">• Long-term contracts</li>
                </ul>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full group">
              <Link href="/milestone-guide">
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-600 mb-4">
            Not sure which structure fits your deal?
          </p>
          <Button asChild size="lg" variant="outline">
            <Link href="/deals/new">
              Start a Deal - We'll Help You Choose
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
