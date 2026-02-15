import { ArrowLeft, Target, CheckCircle, Clock, DollarSign, FileText, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/hero';

export default function MilestoneGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* DealGuard Header */}
      <div className="bg-card rounded-b-3xl shadow-sm">
        <LandingHeader />
      </div>

      {/* Page Header */}
      <div className="bg-purple-600 text-white mt-6">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <Button asChild variant="ghost" className="mb-6 text-white hover:text-white hover:bg-purple-700">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-purple-500 rounded-lg">
              <Target className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Milestone-Based Deals Guide
            </h1>
          </div>
          <p className="text-xl text-purple-100">
            Complete guide to structured, performance-based transactions with DealGuard
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Introduction */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">What are Milestone-Based Deals?</h2>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <p className="text-lg text-slate-700 leading-relaxed mb-4">
              Milestone-based deals break down complex transactions into <strong>staged payments</strong> tied to specific <strong>performance obligations</strong>.
              Each milestone has clear conditions, deliverables, and payment amounts that must be met before funds are released.
            </p>
            <p className="text-slate-600">
              This structure provides maximum protection for both buyers and sellers, ensuring fairness and transparency throughout the entire deal lifecycle.
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
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Define Your Milestones</h3>
                  <p className="text-slate-600 mb-3">
                    Break your deal into clear stages with specific deliverables and payment amounts.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Example:</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>• Milestone 1: Initial deposit (20%) - Contract signed</li>
                      <li>• Milestone 2: Progress payment (30%) - Foundation complete</li>
                      <li>• Milestone 3: Progress payment (30%) - Structure complete</li>
                      <li>• Milestone 4: Final payment (20%) - Handover & inspection</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Set Trigger Conditions</h3>
                  <p className="text-slate-600 mb-3">
                    Define what activates each milestone - time-based, performance-based, or custom conditions.
                  </p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-900">Time-Based</p>
                      <p className="text-xs text-slate-600">Triggered after X days</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-900">Performance</p>
                      <p className="text-xs text-slate-600">When work is completed</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <Target className="w-5 h-5 text-orange-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-900">KPI-Based</p>
                      <p className="text-xs text-slate-600">Custom metrics met</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Submit Evidence</h3>
                  <p className="text-slate-600 mb-3">
                    When a milestone is reached, the performing party submits proof of completion.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">📸 Photos</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">📄 Documents</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">✅ Inspection reports</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">📊 Performance data</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 4 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Review & Approve</h3>
                  <p className="text-slate-600 mb-3">
                    DealGuard admins and/or parties review the evidence and approve the milestone.
                  </p>
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                    <p className="text-sm text-green-900 font-semibold mb-1">Approval Process:</p>
                    <p className="text-sm text-green-800">
                      Once approved, funds are automatically released to the performing party. All actions are logged on the blockchain for transparency.
                    </p>
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
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Risk Mitigation</h3>
              </div>
              <p className="text-slate-600">
                Reduce risk by tying payments to actual performance. Buyers don't pay for incomplete work, sellers get paid as they deliver.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900">Cash Flow Management</h3>
              </div>
              <p className="text-slate-600">
                Structured payments help both parties manage cash flow better. No large upfront payments required.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-slate-900">Clear Documentation</h3>
              </div>
              <p className="text-slate-600">
                Every milestone requires evidence submission, creating a complete audit trail of the project's progress.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Dispute Prevention</h3>
              </div>
              <p className="text-slate-600">
                Clear milestones and evidence requirements reduce misunderstandings and prevent disputes before they start.
              </p>
            </Card>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Best Practices</h2>

          <Card className="p-6 border-l-4 border-blue-500">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">✅ Do:</h3>
                <ul className="space-y-2 ml-6">
                  <li className="text-slate-700">• Define milestones with specific, measurable deliverables</li>
                  <li className="text-slate-700">• Set realistic deadlines with grace periods</li>
                  <li className="text-slate-700">• Specify exactly what evidence is required for each milestone</li>
                  <li className="text-slate-700">• Include quality standards and acceptance criteria</li>
                  <li className="text-slate-700">• Keep milestone amounts proportional to work completed</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-red-600">❌ Don't:</h3>
                <ul className="space-y-2 ml-6">
                  <li className="text-slate-700">• Make milestones too vague ("good progress made")</li>
                  <li className="text-slate-700">• Set unrealistic timelines</li>
                  <li className="text-slate-700">• Skip documentation requirements</li>
                  <li className="text-slate-700">• Front-load too much payment in early milestones</li>
                  <li className="text-slate-700">• Forget to define what happens if delays occur</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Use Cases */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ideal Use Cases</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🏗️ Construction</h3>
              <p className="text-sm text-slate-600">
                Payment tied to completion stages (foundation, framing, finishing, etc.)
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🏢 Real Estate</h3>
              <p className="text-sm text-slate-600">
                Multiple payments from due diligence through closing and transfer
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">📈 Share Transfer</h3>
              <p className="text-sm text-slate-600">
                Staged payments as regulatory approvals and documentation complete
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">💼 M&A Deals</h3>
              <p className="text-sm text-slate-600">
                Complex multi-stage acquisitions with contingencies
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🎨 Creative Projects</h3>
              <p className="text-sm text-slate-600">
                Design, revision, and final delivery phases with client approvals
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">🔧 Long-term Services</h3>
              <p className="text-sm text-slate-600">
                Monthly or quarterly deliverables over extended periods
              </p>
            </Card>
          </div>
        </section>

        {/* Warning */}
        <Card className="mb-12 bg-orange-50 border-orange-200">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900 mb-2">Important Considerations</h3>
                <ul className="space-y-2 text-orange-800">
                  <li>• Milestone-based deals require more upfront planning and documentation</li>
                  <li>• All parties must agree on milestone definitions before starting</li>
                  <li>• Changes to milestones after agreement require approval from all parties</li>
                  <li>• More complex deals may take longer to set up but provide better protection</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Ready to Structure Your Deal?
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Our platform makes it easy to create milestone-based deals. Get started now and we'll guide you through the process.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Link href="/deals/new">
                  Create Milestone-Based Deal
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/single-step-guide">
                  Compare with Single-Step
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
