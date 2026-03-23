'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { financeAPI, formatCurrency, type Transaction, type Payment } from '@/services/financeApi';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';

interface PaymentModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
  isDark: boolean;
}

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit Card'];

export default function PaymentModal({ transaction, onClose, onSaved, isDark }: PaymentModalProps) {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    financeAPI.getPayments(transaction.id).then(setPayments);
  }, [transaction.id]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = transaction.total - totalPaid;

  const handleRecord = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.showWarning('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await financeAPI.recordPayment({
        transactionId: transaction.id,
        amount: amt,
        date,
        mode,
        reference: reference || undefined,
      });
      toast.showSuccess('Payment recorded');
      onSaved();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const modalBg = isDark ? 'card-dark' : 'card-light';
  const inputClass = cn('w-full px-3 py-2 rounded-lg border text-sm font-bold', isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl', modalBg)}>
        <div className={cn('sticky top-0 flex items-center justify-between p-4 border-b bg-inherit z-10', isDark ? 'border-[#404040]' : 'border-slate-200')}>
          <h2 className={cn('text-lg font-bold', isDark ? 'text-slate-100' : 'text-slate-900')}>Payments - {transaction.party}</h2>
          <button onClick={onClose} className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700')}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className={cn('text-xs font-black uppercase tracking-widest mb-3', isDark ? 'text-slate-400' : 'text-slate-600')}>Payment History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded yet</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className={cn('flex justify-between items-center py-2 border-b text-sm', isDark ? 'border-[#404040]' : 'border-slate-200')}>
                    <span className="font-mono">{formatCurrency(p.amount)}</span>
                    <span className="text-slate-500">{p.date}</span>
                    <span className="text-slate-500">{p.mode}</span>
                  </div>
                ))
              )}
            </div>
            <div className={cn('mt-4 p-3 rounded-lg space-y-1 text-sm', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
              <p><span className={cn(isDark ? 'text-slate-400' : 'text-slate-500')}>Total Bill:</span> <span className={cn('font-mono font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(transaction.total)}</span></p>
              <p><span className={cn(isDark ? 'text-slate-400' : 'text-slate-500')}>Total Paid:</span> <span className={cn('font-mono font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(totalPaid)}</span></p>
              <p><span className={cn(isDark ? 'text-slate-400' : 'text-slate-500')}>Balance:</span> <span className={cn('font-mono font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(balance)}</span></p>
            </div>
          </div>
          <div>
            <h3 className={cn('text-xs font-black uppercase tracking-widest mb-3', isDark ? 'text-slate-400' : 'text-slate-600')}>Record New Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputClass} min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reference / Remarks</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
              <button onClick={handleRecord} disabled={saving} className="w-full py-2.5 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm hover:bg-[#A8B838] hover:shadow-md hover:shadow-[#C2D642]/25 disabled:opacity-50 transition-all">
                {saving ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
