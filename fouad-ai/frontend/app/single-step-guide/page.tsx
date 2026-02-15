import { ArrowLeft, Zap, CheckCircle, Clock, Shield, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/hero';

export default function SingleStepGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* DealGuard Header */}
      <div className="bg-card rounded-b-3xl shadow-sm">
        <LandingHeader />
      </div>

      {/* Page Header */}
      <div className="bg-blue-600 text-white mt-6">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <Button asChild variant="ghost" className="mb-6 text-white hover:text-white hover:bg-blue-700">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-blue-500 rounded-lg">
              <Zap className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Single-Step Transactions Guide
            </h1>
          </div>
          <p className="text-xl text-blue-100">
            Fast, straightforward escrow for simple deals where payment and delivery happen together
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Introduction */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">What are Single-Step Transactions?</h2>
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <p className="text-lg text-slate-700 leading-relaxed mb-4">
              Single-step transactions are the simplest form of escrow deal where <strong>one payment</strong> is exchanged for <strong>one delivery</strong> in a single transaction.
              Once both parties confirm their obligations are met, the deal is complete.
            </p>
            <p className="text-slate-600">
              Perfect for straightforward deals where you want maximum protection with minimum complexity.
            </p>
          </Card>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">How It Works</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Create the Deal</h3>
                  <p className="text-slate-600 mb-3">
                    Define what's being exchanged, the payment amount, and invite the other party.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Example:</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>• <strong>Asset:</strong> Used car (2020 Toyota Camry)</li>
                      <li>• <strong>Amount:</strong> EGP 250,000</li>
                      <li>• <strong>Buyer:</strong> Ahmed Mohamed</li>
                      <li>• <strong>Seller:</strong> Sarah Ali</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Buyer Funds Escrow</h3>
                  <p className="text-slate-600 mb-3">
                    The buyer deposits the payment amount into DealGuard's secure escrow account.
                  </p>
                  <div className="flex items-start gap-3 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-900 font-semibold mb-1">Funds are Protected</p>
                      <p className="text-sm text-green-800">
                        Money is held securely by DealGuard until both parties confirm the deal is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Seller Delivers</h3>
                  <p className="text-slate-600 mb-3">
                    The seller delivers the goods or services and submits proof of delivery.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1.5 bg-blue-100 rounded-full text-sm text-blue-900 font-medium">📸 Photos of item</span>
                    <span className="px-3 py-1.5 bg-blue-100 rounded-full text-sm text-blue-900 font-medium">📄 Transfer documents</span>
                    <span className="px-3 py-1.5 bg-blue-100 rounded-full text-sm text-blue-900 font-medium">✅ Delivery confirmation</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 4 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Buyer Confirms Receipt</h3>
                  <p className="text-slate-600 mb-3">
                    The buyer inspects the delivery and confirms everything is as agreed.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                      <p className="text-sm font-semibold text-green-900">If Satisfied</p>
                      <p className="text-xs text-green-700">Buyer approves → Funds released to seller</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <AlertCircle className="w-5 h-5 text-orange-600 mb-2" />
                      <p className="text-sm font-semibold text-orange-900">If Issues</p>
                      <p className="text-xs text-orange-700">Buyer disputes → DealGuard reviews</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 5 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Deal Complete</h3>
                  <p className="text-slate-600 mb-3">
                    Once approved, funds are immediately released to the seller. The deal is recorded on the blockchain for permanent verification.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Clock className="w-4 h-4" />
                    <span>Average completion time: 1-3 days</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Key Benefits</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900">Fast & Simple</h3>
              </div>
              <p className="text-slate-600">
                No complex milestone setups. Create a deal, fund it, deliver, and done. Perfect for time-sensitive transactions.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Buyer Protection</h3>
              </div>
              <p className="text-slate-600">
                Your money is safe until you confirm receipt. If something goes wrong, DealGuard mediates to ensure fairness.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Seller Confidence</h3>
              </div>
              <p className="text-slate-600">
                Know the buyer has the funds before you deliver. No risk of non-payment or bounced checks.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900">Low Fees</h3>
              </div>
              <p className="text-slate-600">
                Simple deals have simple fees. No hidden costs or surprises - transparent pricing from the start.
              </p>
            </Card>
          </div>
        </section>

        {/* Perfect For */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Perfect For</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🚗 Vehicle Sales</h3>
              <p className="text-sm text-slate-600 mb-3">
                Cars, motorcycles, boats - any vehicle where payment and title transfer happen together.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 2-4 days
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">💻 Equipment Sales</h3>
              <p className="text-sm text-slate-600 mb-3">
                Electronics, machinery, tools - straightforward buy/sell transactions.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 1-3 days
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🎨 Freelance Work</h3>
              <p className="text-sm text-slate-600 mb-3">
                One-time projects with clear deliverables and fixed pricing.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 1-5 days
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🎯 Service Contracts</h3>
              <p className="text-sm text-slate-600 mb-3">
                Single service delivery with payment upon completion.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 1-7 days
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">📦 Product Sales</h3>
              <p className="text-sm text-slate-600 mb-3">
                High-value items sold between individuals or businesses.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 2-5 days
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">📱 Digital Assets</h3>
              <p className="text-sm text-slate-600 mb-3">
                Domain names, software licenses, digital content.
              </p>
              <div className="text-xs text-slate-500">
                Avg. completion: 1-2 days
              </div>
            </Card>
          </div>
        </section>

        {/* When to Choose */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">When to Choose Single-Step</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Choose Single-Step If:</h3>
              <ul className="space-y-2">
                <li className="text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Delivery happens all at once</span>
                </li>
                <li className="text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Deal can be completed quickly</span>
                </li>
                <li className="text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Value is straightforward to verify</span>
                </li>
                <li className="text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>You want minimal complexity</span>
                </li>
                <li className="text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Both parties are ready now</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-orange-50 border-orange-200">
              <h3 className="text-lg font-semibold text-orange-900 mb-3">⚠️ Consider Milestone-Based If:</h3>
              <ul className="space-y-2">
                <li className="text-sm text-orange-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Work happens in stages</span>
                </li>
                <li className="text-sm text-orange-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Project takes weeks/months</span>
                </li>
                <li className="text-sm text-orange-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Multiple payment installments needed</span>
                </li>
                <li className="text-sm text-orange-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Performance needs to be tracked</span>
                </li>
                <li className="text-sm text-orange-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Complex deliverables or approvals</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Common Questions</h2>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2">How long does the process take?</h3>
              <p className="text-sm text-slate-600">
                Most single-step deals complete within 1-5 days. The timeline depends on how quickly both parties submit proof and confirmations.
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2">What if the buyer never confirms?</h3>
              <p className="text-sm text-slate-600">
                If the buyer doesn't confirm within the agreed timeframe, the seller can escalate to DealGuard admin for review. We'll examine the evidence and make a fair determination.
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2">Can I cancel after funding?</h3>
              <p className="text-sm text-slate-600">
                Both parties must agree to cancel. If there's a dispute, DealGuard will review the situation and determine the appropriate resolution.
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2">What if I receive damaged goods?</h3>
              <p className="text-sm text-slate-600">
                Don't confirm receipt. Instead, document the damage with photos and file a dispute. DealGuard will review the evidence from both parties and mediate a fair resolution.
              </p>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Ready to Start Your Deal?
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Create your single-step transaction in minutes. Simple, secure, and transparent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/deals/new">
                  Create Single-Step Deal
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/milestone-guide">
                  Compare with Milestone-Based
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
