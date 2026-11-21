import React from 'react';
import {
  CheckCircle2,
  Database,
  HelpCircle,
  Lock,
  LogIn,
  LogOut,
  MessageSquare,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface SettingsPageProps {
  section: 'integrations' | 'settings' | 'help';
}

export function SettingsPage({ section }: SettingsPageProps) {
  const { backendHealth, user, loginWithGoogle, logout, authLoading, authError } = useWorkspace();

  if (section === 'integrations') {
    return (
      <div className="p-5 max-w-[1200px] mx-auto space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">
            Integrations & Service Architecture
          </h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Transparent status of connected services. External credentials are never simulated as connected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Python FastAPI Backend */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#17231E]">
                <Server className="w-4 h-4 text-[#176B45]" />
                <span>External Python FastAPI Engine</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  backendHealth.pythonBackendReachable ? 'text-[#248451]' : 'text-[#D99124]'
                }`}
              >
                {backendHealth.pythonBackendReachable
                  ? 'Connected'
                  : 'Not Deployed (Demo Mode Active)'}
              </span>
            </div>
            <p className="text-xs text-[#64746B] leading-relaxed">
              Dedicated FastAPI service (<code className="font-mono-num">python-backend/</code>) for
              NetworkX graph processing, RapidFuzz entity resolution, Decimal verification, PyMuPDF
              batch extraction, and PostgreSQL persistence. Configure{' '}
              <code className="font-mono-num">PYTHON_BACKEND_URL</code> and{' '}
              <code className="font-mono-num">BACKEND_SERVICE_TOKEN</code> on the Node BFF to route live traffic.
            </p>
          </div>

          {/* WhatsApp Business Cloud API */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#17231E]">
                <MessageSquare className="w-4 h-4 text-[#176B45]" />
                <span>WhatsApp Business Platform Cloud API</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  backendHealth.whatsappConfigured ? 'text-[#248451]' : 'text-[#64746B]'
                }`}
              >
                {backendHealth.whatsappConfigured ? 'Verified' : 'Disabled — Credentials Required'}
              </span>
            </div>
            <p className="text-xs text-[#64746B] leading-relaxed">
              Webhook endpoints (<code className="font-mono-num">GET/POST /api/v1/integrations/whatsapp/webhook</code>)
              ingest plain-text messages directly without OCR and route image/PDF attachments into
              Gemini extraction. Disabled until <code className="font-mono-num">WHATSAPP_ACCESS_TOKEN</code>,{' '}
              <code className="font-mono-num">WHATSAPP_VERIFY_TOKEN</code>, and{' '}
              <code className="font-mono-num">WHATSAPP_APP_SECRET</code> are configured.
            </p>
          </div>

          {/* Firebase Auth & Firestore */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#17231E]">
                <Database className="w-4 h-4 text-[#176B45]" />
                <span>Firebase Auth & Firestore Persistence</span>
              </div>
              <span className="text-xs font-semibold text-[#248451]">Provisioned</span>
            </div>
            <p className="text-xs text-[#64746B] leading-relaxed">
              Google Sign-In authentication and owner-isolated Firestore collections persist uploaded
              document metadata, manual OCR corrections, finding reviews, isolated simulations
              (<code className="font-mono-num">simulated: true</code>), and immutable audit logs.
            </p>
          </div>

          {/* Optional Local PaddleOCR Adapter */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#17231E]">
                <ShieldCheck className="w-4 h-4 text-[#176B45]" />
                <span>Optional PaddleOCR Fallback Adapter</span>
              </div>
              <span className="text-xs font-semibold text-[#64746B]">
                {backendHealth.paddleOcrEnabled ? 'Enabled' : 'Disabled by Default'}
              </span>
            </div>
            <p className="text-xs text-[#64746B] leading-relaxed">
              Primary OCR runs through server-side Gemini (<code className="font-mono-num">{backendHealth.geminiModel}</code>).
              A modular PaddleOCR adapter exists in <code className="font-mono-num">python-backend/app/ocr/paddle_adapter.py</code>{' '}
              and remains disabled (<code className="font-mono-num">ENABLE_PADDLE_OCR=false</code>) unless
              local recognition benchmarks justify enabling it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'help') {
    return (
      <div className="p-5 max-w-[1100px] mx-auto space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">
            EvidenceOS Methodology & Governance
          </h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            &ldquo;Evidence first. Intelligence second. Decisions with accountability.&rdquo;
          </p>
        </div>

        <div className="bg-white border border-[#DCE7DF] rounded-xl p-6 space-y-4 text-xs text-[#17231E] leading-relaxed">
          <div className="flex items-center gap-2 font-display font-semibold text-sm">
            <HelpCircle className="w-4 h-4 text-[#176B45]" />
            <span>Core Investigation & Accuracy Principles</span>
          </div>
          <ul className="space-y-2 text-[#64746B]">
            <li>
              <strong className="text-[#17231E]">1. Never guess illegible figures:</strong> Handwritten
              ledger amounts that are smudged or unreadable are normalized to <code className="font-mono-num">null</code>{' '}
              and flagged for analyst manual review. Original OCR text is preserved permanently even after manual correction.
            </li>
            <li>
              <strong className="text-[#17231E]">2. Investigation signals, not fraud accusations:</strong>{' '}
              Amount variances, missing bank entries, and circular transaction loops (A → B → C → A)
              are surfaced with exact document citations and explanations. Legitimate cash settlements
              and incomplete books are explicitly accommodated.
            </li>
            <li>
              <strong className="text-[#17231E]">3. Deterministic Credit & Loan Math:</strong> The
              EvidenceOS Financial Readiness Score (0–100) and Indicative Loan Capacity are computed
              via transparent, versioned formulas and standard present-value amortization — never
              hallucinated by an LLM.
            </li>
            <li>
              <strong className="text-[#17231E]">4. Strict Data Separation:</strong> Verified facts,
              AI extractions, manual analyst corrections, demonstration records, and hypothetical
              simulations (<code className="font-mono-num">simulated: true</code>) are stored and
              audited separately.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-[1000px] mx-auto space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-[#17231E]">Workspace Settings</h2>
        <p className="text-sm text-[#64746B] mt-0.5">
          Manage your analyst identity, cloud persistence, and server-side AI model configuration.
        </p>
      </div>

      {/* Analyst Account & Firebase Auth */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm text-[#17231E]">
              Analyst Account (Firebase Google Sign-In)
            </h3>
            <p className="text-xs text-[#64746B] mt-0.5">
              Sign in with Google to synchronize uploaded document records, manual OCR corrections,
              saved stress tests, and audit events to Firestore.
            </p>
          </div>

          {user ? (
            <button
              type="button"
              onClick={logout}
              disabled={authLoading}
              className="px-3.5 py-2 rounded-lg border border-[#DCE7DF] hover:bg-[#F0F5F1] text-xs font-semibold text-[#17231E] inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={authLoading}
              className="px-4 py-2 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>

        {authError && (
          <div className="text-xs text-[#DC4545] bg-[#FEF2F2] border border-[#DC4545]/30 p-3 rounded-lg">
            {authError}
          </div>
        )}

        {user && (
          <div className="p-3.5 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-[#17231E]">{user.displayName}</div>
              <div className="text-[#64746B]">{user.email}</div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[#248451] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Firestore Sync Active</span>
            </div>
          </div>
        )}
      </section>

      {/* AI & Security Configuration (Read-Only Server Environment Summary) */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#17231E]">
          <Lock className="w-4 h-4 text-[#176B45]" />
          <span>Server-Side AI & Privacy Controls</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
            <div className="text-[#64746B]">Configured OCR / Low-Latency Model</div>
            <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
              {backendHealth.geminiModel}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
            <div className="text-[#64746B]">Configured Reasoning / Grounding Model</div>
            <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
              {backendHealth.geminiReasoningModel}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#64746B]">
          All Gemini API calls execute exclusively on the server side via the official Google GenAI
          SDK. Sensitive PAN numbers, bank account numbers, and document contents are never written
          to browser logs.
        </p>
      </section>
    </div>
  );
}
