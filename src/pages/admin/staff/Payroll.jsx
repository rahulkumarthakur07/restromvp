import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingDown, Users, Plus, X, Clock,
  CheckCircle, AlertTriangle, Gift, CreditCard, History,
  ChevronDown, ChevronUp,
} from "lucide-react";

const STAFF_KEY = "resmvp_staff_members";
const PAYROLL_KEY = "resmvp_payroll_data2";

// ── helpers ────────────────────────────────────────────────────────────────
const key = (month, staffId, field) => `${month}||${staffId}||${field}`;

export default function Payroll() {
  const [staff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY)) || []; }
    catch { return []; }
  });

  const [payroll, setPayroll] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PAYROLL_KEY)) || {}; }
    catch { return {}; }
  });

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payModal, setPayModal] = useState(null);   // staffId being paid
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [expandedStaff, setExpandedStaff] = useState(null);

  useEffect(() => { localStorage.setItem(PAYROLL_KEY, JSON.stringify(payroll)); }, [payroll]);

  // ── per-staff accessors ──────────────────────────────────────────────────
  const get   = (sId, field, def = 0) => payroll[key(month, sId, field)] ?? def;
  const set   = (sId, field, val)     => setPayroll(p => ({ ...p, [key(month, sId, field)]: val }));
  const getHistory = (sId)            => payroll[key(month, sId, "history")] ?? [];

  const finalPay = (s) => {
    const base = s.salary || 0;
    const bonus = get(s.id, "bonus");
    const ded   = get(s.id, "deduction");
    return Math.max(0, base + bonus - ded);
  };

  const totalPaid  = (sId) => getHistory(sId).reduce((sum, e) => sum + e.amount, 0);
  const udharOwed  = (s)   => Math.max(0, finalPay(s) - totalPaid(s.id));
  const isFullyPaid = (s)  => udharOwed(s) === 0 && getHistory(s.id).length > 0;

  // ── pay action ──────────────────────────────────────────────────────────
  const handlePay = (e) => {
    e.preventDefault();
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    const s = staff.find(x => x.id === payModal);
    if (!amount) return;

    const entry = {
      id: Date.now().toString(),
      amount,
      note: payNote.trim() || "—",
      timestamp: Date.now(),
    };
    const prev = getHistory(payModal);
    setPayroll(p => ({ ...p, [key(month, payModal, "history")]: [entry, ...prev] }));
    setPayModal(null);
    setPayAmount("");
    setPayNote("");
  };

  // ── summary stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let totalBase = 0, totalBonus = 0, totalDed = 0, totalFinal = 0, totalPaidAmt = 0, totalUdhar = 0;
    staff.forEach(s => {
      const base  = s.salary || 0;
      const bonus = get(s.id, "bonus");
      const ded   = get(s.id, "deduction");
      const fin   = Math.max(0, base + bonus - ded);
      const paid  = totalPaid(s.id);
      totalBase  += base; totalBonus += bonus; totalDed   += ded;
      totalFinal += fin;  totalPaidAmt += paid; totalUdhar += Math.max(0, fin - paid);
    });
    return { totalBase, totalBonus, totalDed, totalFinal, totalPaidAmt, totalUdhar };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, payroll, month]);

  const staffForModal = staff.find(s => s.id === payModal);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-3">
              <DollarSign className="w-4 h-4" /><span>Payroll</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-none mb-1">Payroll Management</h1>
            <p className="text-gray-400 font-medium text-sm">Full salary control — bonuses, deductions, partial payments & udhar tracking.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-extrabold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all" />
          </div>
        </div>

        {/* Summary strip */}
        <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          {[
            { label: "Base Total",   val: summary.totalBase,    color: "gray",    icon: DollarSign },
            { label: "Bonus",        val: summary.totalBonus,   color: "violet",  icon: Gift },
            { label: "Deductions",   val: summary.totalDed,     color: "red",     icon: TrendingDown },
            { label: "Net Payable",  val: summary.totalFinal,   color: "emerald", icon: CheckCircle },
            { label: "Paid So Far",  val: summary.totalPaidAmt, color: "blue",    icon: CreditCard },
            { label: "Udhar Pending",val: summary.totalUdhar,   color: "amber",   icon: AlertTriangle },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-3xl px-4 py-3`}>
              <span className={`text-[9px] font-extrabold text-${color}-500 uppercase tracking-widest mb-1 flex items-center gap-1`}>
                <Icon className="w-3 h-3" /> {label}
              </span>
              <span className={`text-base font-extrabold text-${color}-700 tabular-nums`}>₹{val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Staff Payroll Cards ───────────────────────────────────────────── */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-4xl border border-gray-100 shadow-sm py-24 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-5"><Users className="w-10 h-10 text-gray-200" /></div>
          <p className="font-black text-gray-300 text-xl mb-1">No staff added</p>
          <p className="text-gray-300 font-medium text-sm">Add staff from the All Staff section first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(s => {
            const base     = s.salary || 0;
            const bonus    = get(s.id, "bonus");
            const ded      = get(s.id, "deduction");
            const dedNote  = get(s.id, "dedNote", "");
            const fin      = finalPay(s);
            const paid     = totalPaid(s.id);
            const udhar    = udharOwed(s);
            const history  = getHistory(s.id);
            const expanded = expandedStaff === s.id;
            const fully    = isFullyPaid(s);

            return (
              <div key={s.id} className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Staff row */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 md:w-52 shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center font-extrabold text-white text-sm shadow-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm leading-tight">{s.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{s.role}</p>
                    </div>
                  </div>

                  {/* Salary breakdown */}
                  <div className="flex flex-wrap gap-2 flex-1">
                    {/* Base */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 flex flex-col min-w-[90px]">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Base</span>
                      <span className="font-extrabold text-gray-900 text-sm tabular-nums">₹{base.toLocaleString()}</span>
                    </div>

                    {/* Bonus editable */}
                    <div className="bg-violet-50 border border-violet-100 rounded-2xl px-3 py-2 flex flex-col min-w-[90px]">
                      <span className="text-[9px] font-extrabold text-violet-500 uppercase tracking-widest flex items-center gap-1"><Gift className="w-2.5 h-2.5" />Bonus</span>
                      <div className="relative">
                        <span className="text-[10px] text-violet-400 absolute left-0 top-1/2 -translate-y-1/2">₹</span>
                        <input type="number" min="0" value={bonus || ""} placeholder="0"
                          onChange={e => set(s.id, "bonus", parseFloat(e.target.value) || 0)}
                          className="pl-3 w-16 bg-transparent border-none outline-none font-extrabold text-violet-700 text-sm tabular-nums" />
                      </div>
                    </div>

                    {/* Deduction editable */}
                    <div className="bg-red-50 border border-red-100 rounded-2xl px-3 py-2 flex flex-col min-w-[90px]">
                      <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5" />Deduction</span>
                      <div className="relative">
                        <span className="text-[10px] text-red-400 absolute left-0 top-1/2 -translate-y-1/2">₹</span>
                        <input type="number" min="0" value={ded || ""} placeholder="0"
                          onChange={e => set(s.id, "deduction", parseFloat(e.target.value) || 0)}
                          className="pl-3 w-16 bg-transparent border-none outline-none font-extrabold text-red-700 text-sm tabular-nums" />
                      </div>
                    </div>

                    {/* Final */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2 flex flex-col min-w-[90px]">
                      <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest">Net Pay</span>
                      <span className="font-extrabold text-emerald-700 text-sm tabular-nums">₹{fin.toLocaleString()}</span>
                    </div>

                    {/* Paid */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-3 py-2 flex flex-col min-w-[90px]">
                      <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest">Paid</span>
                      <span className="font-extrabold text-blue-700 text-sm tabular-nums">₹{paid.toLocaleString()}</span>
                    </div>

                    {/* Udhar */}
                    <div className={`${udhar > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"} border rounded-2xl px-3 py-2 flex flex-col min-w-[90px]`}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest ${udhar > 0 ? "text-amber-500" : "text-gray-400"}`}>Udhar</span>
                      <span className={`font-extrabold text-sm tabular-nums ${udhar > 0 ? "text-amber-700" : "text-gray-400"}`}>₹{udhar.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {fully ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <button onClick={() => { setPayModal(s.id); setPayAmount(String(udhar)); setPayNote(""); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-950 hover:bg-black text-white font-extrabold rounded-2xl text-xs shadow-lg transition-all active:scale-95">
                        <CreditCard className="w-3.5 h-3.5" /> Pay Now
                      </button>
                    )}
                    <button onClick={() => setExpandedStaff(expanded ? null : s.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 border border-gray-200 transition-all">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Deduction note */}
                {ded > 0 && (
                  <div className="px-5 pb-3">
                    <input type="text" placeholder="Deduction reason (optional)" value={dedNote}
                      onChange={e => set(s.id, "dedNote", e.target.value)}
                      className="w-full px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 outline-none placeholder:text-red-300 focus:ring-1 focus:ring-red-300 transition-all" />
                  </div>
                )}

                {/* Payment history */}
                {expanded && (
                  <div className="border-t border-gray-50 bg-gray-50/40 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <History className="w-3 h-3" /> Payment History — {new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
                    </p>
                    {history.length === 0 ? (
                      <p className="text-sm text-gray-300 font-bold text-center py-4">No payments recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {history.map(entry => (
                          <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-sm">₹{entry.amount.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {new Date(entry.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                  {" · "}
                                  {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.note !== "—" && (
                                <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl">{entry.note}</span>
                              )}
                              <button onClick={() => {
                                if (window.confirm("Are you sure you want to delete this payment record? This will increase the Udhar (Owed) amount again.")) {
                                  const updated = history.filter(h => h.id !== entry.id);
                                  setPayroll(p => ({ ...p, [key(month, s.id, "history")]: updated }));
                                }
                              }} className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition-all text-[10px]">
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pay Now Modal ─────────────────────────────────────────────────── */}
      {payModal && staffForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div>
                <h2 className="font-black text-gray-950 text-lg">Record Payment</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  For <span className="font-black text-gray-700">{staffForModal.name}</span>
                </p>
              </div>
              <button onClick={() => setPayModal(null)} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4">
              {/* Quick info */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Net Pay",  val: finalPay(staffForModal), color: "emerald" },
                  { label: "Paid",     val: totalPaid(staffForModal.id), color: "blue" },
                  { label: "Udhar",    val: udharOwed(staffForModal), color: "amber" },
                ].map(({ label, val, color }) => (
                  <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-2xl px-3 py-2 text-center`}>
                    <p className={`text-[9px] font-black text-${color}-500 uppercase tracking-widest`}>{label}</p>
                    <p className={`font-black text-${color}-700 text-sm`}>₹{val.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Amount to Pay *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                  <input required autoFocus type="number" min="1" step="any"
                    placeholder={`Max remaining: ₹${udharOwed(staffForModal)}`}
                    value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 transition-all" />
                </div>
                {/* Quick fill buttons */}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} type="button"
                      onClick={() => setPayAmount(String(Math.round(finalPay(staffForModal) * pct / 100)))}
                      className="flex-1 py-1.5 text-[10px] font-black text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-all">
                      {pct}%
                    </button>
                  ))}
                  <button type="button" onClick={() => setPayAmount(String(udharOwed(staffForModal)))}
                    className="flex-1 py-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-100 transition-all">
                    Full
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Note (optional)</label>
                <input type="text" placeholder="e.g. Cash, UPI, Advance..." value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all" />
              </div>

              {/* Preview */}
              {payAmount && parseFloat(payAmount) > 0 && (
                <div className={`rounded-2xl px-4 py-3 flex justify-between items-center border ${
                  parseFloat(payAmount) >= udharOwed(staffForModal)
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-amber-50 border-amber-100"
                }`}>
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Udhar After</span>
                  <span className={`font-black text-base ${parseFloat(payAmount) >= udharOwed(staffForModal) ? "text-emerald-600" : "text-amber-600"}`}>
                    ₹{Math.max(0, udharOwed(staffForModal) - (parseFloat(payAmount) || 0)).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayModal(null)}
                  className="flex-1 py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" /> Confirm Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
