import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            fouad.ai
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Digital Escrow & Conditional Settlement Platform
          </p>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-12">
            Reducing risk in transactions where payment and performance don't happen simultaneously.
            Structured workflows. Evidence-based milestones. Blockchain-anchored audit trails.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/deals"
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              View Deals
            </Link>
            <Link
              href="/deals/new"
              className="px-6 py-3 bg-white text-slate-900 border-2 border-slate-900 rounded-lg hover:bg-slate-50 transition"
            >
              Create Deal
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">Contract Management</h3>
            <p className="text-slate-600 text-sm">
              Physical contract primacy with structured digital twin. Version control with explicit party acceptance.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">📧</div>
            <h3 className="text-lg font-semibold mb-2">Evidence Intake</h3>
            <p className="text-slate-600 text-sm">
              Each deal gets a dedicated email inbox. Parties submit evidence naturally via email.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI-Assisted</h3>
            <p className="text-slate-600 text-sm">
              Frontier AI suggests structure, mapping, risks. Humans always approve final decisions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold mb-2">Custody Layer</h3>
            <p className="text-slate-600 text-sm">
              Manual fund movement with verified proof. Admin-controlled release/return authorization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">⛓️</div>
            <h3 className="text-lg font-semibold mb-2">Blockchain Anchored</h3>
            <p className="text-slate-600 text-sm">
              Hash-only notarization for tamper-evident audit trail. No PII on-chain.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-3xl mb-4">⚖️</div>
            <h3 className="text-lg font-semibold mb-2">Dispute Resolution</h3>
            <p className="text-slate-600 text-sm">
              Structured workflow for disputes with evidence collection and admin mediation.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center text-sm text-slate-500">
          <p>MVP • Governance + Proof Layer • Human-in-the-Loop AI</p>
        </div>
      </div>
    </main>
  );
}
