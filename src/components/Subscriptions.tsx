import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  Building2, 
  Clock, 
  ArrowRight, 
  Download, 
  HelpCircle,
  Tag,
  Check,
  Star,
  AlertCircle
} from 'lucide-react';
import { getSchoolProfile, secureGet, secureSet } from '../utils/db';

interface Plan {
  id: string;
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Standard Plan',
    price: 'KES 15,000',
    period: 'per term',
    description: 'Essential management for small primary & junior schools.',
    features: [
      'Up to 300 Active Learners',
      'Basic Report Cards & Term Grading',
      'Attendance Tracking Roll',
      'Fee Collection & Receipts',
      'Parent Portal Access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Academic Suite',
    badge: 'Current Plan',
    popular: true,
    price: 'KES 28,000',
    period: 'per term',
    description: 'Comprehensive suite for growing primary & secondary institutions.',
    features: [
      'Unlimited Student Accounts',
      'WhatsApp Automatic Fee Alerts',
      'Gate QR/Barcode Check-in Scanner',
      'MongoDB Cloud Realtime Sync',
      'Custom Grade Fee Structures',
      'PDF Academic Transcript Generator',
      'Staff Attendance & Payroll Logs'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Network',
    badge: 'Institutional',
    price: 'KES 45,000',
    period: 'per term',
    description: 'Multi-campus institutions requiring custom SLA & dedicated support.',
    features: [
      'All Pro Features Included',
      'Multi-Campus Central Dashboard',
      'Custom SMS Gateway Routing',
      'Dedicated Cloud Database Cluster',
      '24/7 Priority Telephone Support',
      'Data Export & Backup Automation',
      'Custom Domain Integration'
    ]
  }
];

interface Invoice {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  receiptNo: string;
}

export default function Subscriptions() {
  const schoolProfile = getSchoolProfile();
  const [activePlanId, setActivePlanId] = useState<string>('pro');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = secureGet('subscriptions_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Modal for adding custom subscription
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newAmount, setNewAmount] = useState('KES ');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newReceiptNo, setNewReceiptNo] = useState('');
  const [newStatus, setNewStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Paid');

  const saveInvoices = (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    secureSet('subscriptions_history', JSON.stringify(newInvoices));
  };

  const handleAddCustomSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newAmount.trim()) {
      alert('Please fill in the Plan Name and Amount.');
      return;
    }
    const newInv: Invoice = {
      id: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      date: newDate || new Date().toISOString().split('T')[0],
      amount: newAmount.startsWith('KES') ? newAmount : `KES ${newAmount}`,
      plan: newPlanName,
      status: newStatus,
      receiptNo: newReceiptNo.trim() || `REC-MPESA-${Math.floor(100000 + Math.random() * 900000)}`
    };
    const updated = [newInv, ...invoices];
    saveInvoices(updated);
    setNewPlanName('');
    setNewAmount('KES ');
    setNewReceiptNo('');
    setIsAddModalOpen(false);
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('🗑️ Delete this subscription entry?')) {
      const updated = invoices.filter(inv => inv.id !== id);
      saveInvoices(updated);
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    if (promoCode.trim().toUpperCase() === 'SCHOOL2026' || promoCode.trim().toUpperCase() === 'VIP') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid coupon code. Try "SCHOOL2026"');
      setPromoApplied(false);
    }
  };

  const handleUpgradePlan = (plan: Plan) => {
    if (plan.id === activePlanId) return;
    if (window.confirm(`Would you like to select the ${plan.name} (${plan.price}/${plan.period})?`)) {
      setActivePlanId(plan.id);
      const newInv: Invoice = {
        id: `INV-2026-00${invoices.length + 1}`,
        date: new Date().toISOString().split('T')[0],
        amount: plan.price,
        plan: `${plan.name} Renewal`,
        status: 'Paid',
        receiptNo: `REC-MPESA-${Math.floor(100000 + Math.random() * 900000)}`
      };
      setInvoices([newInv, ...invoices]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 p-3 sm:p-5 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg shadow-blue-600/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">System Subscriptions & Licensing</h1>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active License
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage your school portal software subscription, billing invoices, and upgrade features.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-right hidden md:block">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Institution</span>
              <span className="text-xs font-black text-slate-800">{schoolProfile.name || 'Main Campus'}</span>
            </div>
          </div>
        </div>

        {/* CURRENT SUBSCRIPTION BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Pro Academic Suite Plan</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                All-Inclusive School Management Active
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your subscription includes MongoDB cloud backup, real-time WhatsApp fee notification alerts, academic transcript printing, and unlimited parent account access.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 space-y-2 min-w-[220px]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Billing Period:</span>
                <span className="font-bold text-white">Termly</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Next Renewal:</span>
                <span className="font-bold text-emerald-400">Term 3 2026</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
                <span className="text-slate-300">Status:</span>
                <span className="font-extrabold text-xs text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Fully Paid
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRICING PLANS GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Available Subscription Tiers</h3>
              <p className="text-xs text-slate-500">Select or upgrade your school management license tier.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === activePlanId;
              return (
                <div 
                  key={plan.id} 
                  className={`bg-white rounded-3xl p-6 border transition-all relative flex flex-col justify-between space-y-5 ${
                    isCurrent 
                      ? 'border-blue-600 shadow-xl ring-2 ring-blue-600/20' 
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                      Recommended
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 text-base">{plan.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 min-h-[36px]">{plan.description}</p>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-2xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-xs text-slate-400 font-bold ml-1">/{plan.period}</span>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Features Included</span>
                      <ul className="space-y-2">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpgradePlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Active Subscribed Plan</span>
                      </>
                    ) : (
                      <>
                        <span>Select Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* COUPON & INVOICES ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coupon / Promo Box */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Redeem Discount Code</h4>
                <p className="text-xs text-slate-500">Apply promo or license voucher</p>
              </div>
            </div>

            <form onSubmit={handleApplyPromo} className="space-y-2.5">
              <input
                type="text"
                placeholder="Enter Code e.g. SCHOOL2026"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 uppercase"
              />

              {promoApplied && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>15% Subscription Discount applied to next billing!</span>
                </div>
              )}

              {promoError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Apply Voucher Code
              </button>
            </form>
          </div>

          {/* Billing History & Receipts */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Subscription Billing History</h4>
                <p className="text-xs text-slate-500">Record, download & manage your official payment receipts</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Add Record</span>
                </button>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{invoices.length} Records</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {invoices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No custom subscriptions added yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Add Record" above to add your official subscription receipts.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="pb-2">Invoice ID</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Plan / Item</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 font-mono font-bold text-slate-800">{inv.id}</td>
                        <td className="py-3 text-slate-500">{inv.date}</td>
                        <td className="py-3 font-medium text-slate-700">{inv.plan}</td>
                        <td className="py-3 font-mono font-bold text-slate-900">{inv.amount}</td>
                        <td className="py-3">
                          <span className={`border text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            inv.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="Delete Subscription Entry"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ADD CUSTOM SUBSCRIPTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-sm">Add Custom Subscription Record</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomSubscription} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan / Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pro Academic Suite (Term 1 2026)" 
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount</label>
                  <input 
                    type="text" 
                    placeholder="KES 28,000" 
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">M-Pesa / Receipt Ref</label>
                  <input 
                    type="text" 
                    placeholder="e.g. REC-MPESA-99381" 
                    value={newReceiptNo}
                    onChange={(e) => setNewReceiptNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select 
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE RECEIPT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">Official Subscription Receipt</h3>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference No:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Paid:</span>
                <span className="text-slate-800">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription:</span>
                <span className="text-slate-800">{selectedInvoice.plan}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">Total Amount:</span>
                <span className="font-black text-emerald-700">{selectedInvoice.amount}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
