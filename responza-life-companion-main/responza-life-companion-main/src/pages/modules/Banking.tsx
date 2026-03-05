import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Plus, X, Landmark, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const loanTypes = ['home_loan', 'personal_loan', 'educational_loan', 'vehicle_loan', 'gold_loan', 'other_loan'];

const Banking = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<'banks' | 'loans'>('banks');
  const [showAdd, setShowAdd] = useState(false);

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [last4, setLast4] = useState('');

  // Loan fields
  const [loanType, setLoanType] = useState('');
  const [emi, setEmi] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [dueDate, setDueDate] = useState('');

  const db = getDb();
  const banks = db.bankAccounts.filter(b => b.userId === user?.id);
  const loans = db.loans.filter(l => l.userId === user?.id);

  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const saveBank = async () => {
    if (!bankName || !ifsc || !last4) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bank/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_name: bankName,
          ifsc_code: ifsc,
          account_number: last4,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save bank details');
        return;
      }
    } catch {
      toast.error('Network error while saving bank details');
      return;
    }

    updateDb(db => ({
      ...db,
      bankAccounts: [...db.bankAccounts, { id: generateId(), userId: user!.id, bankName, ifscCode: ifsc, accountLast4: last4, createdAt: new Date().toISOString() }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setBankName(''); setIfsc(''); setLast4('');
  };

  const saveLoan = async () => {
    if (!loanType || !emi || !outstanding || !rate || !tenure || !dueDate) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/loans/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          loan_type: loanType,
          emi: +emi || 0,
          outstanding_amount: +outstanding || 0,
          interest_rate: +rate || 0,
          remaining_tenure: +tenure || 0,
          due_date: dueDate,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save loan');
        return;
      }
    } catch {
      toast.error('Network error while saving loan');
      return;
    }

    updateDb(db => ({
      ...db,
      loans: [...db.loans, {
        id: generateId(), userId: user!.id, loanType, monthlyEmi: +emi, outstandingAmount: +outstanding,
        interestRate: +rate, remainingTenure: +tenure, dueDate, createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setLoanType(''); setEmi(''); setOutstanding(''); setRate(''); setTenure(''); setDueDate('');
  };

  const deleteBank = (id: string) => { updateDb(db => ({ ...db, bankAccounts: db.bankAccounts.filter(b => b.id !== id) })); toast.success(t('delete') + ' ✓'); };
  const deleteLoan = (id: string) => { updateDb(db => ({ ...db, loans: db.loans.filter(l => l.id !== id) })); toast.success(t('delete') + ' ✓'); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">{t('banking')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <div className="flex mb-4 bg-secondary rounded-lg p-1">
        <button onClick={() => { setTab('banks'); setShowAdd(false); }} className={`flex-1 py-2 rounded-md text-sm font-semibold ${tab === 'banks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('banks')}</button>
        <button onClick={() => { setTab('loans'); setShowAdd(false); }} className={`flex-1 py-2 rounded-md text-sm font-semibold ${tab === 'loans' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('loans')}</button>
      </div>

      <AnimatePresence>
        {showAdd && tab === 'banks' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <input className={inputClass} placeholder={t('bank_name')} value={bankName} onChange={e => setBankName(e.target.value)} />
            <input className={inputClass} placeholder={t('ifsc_code')} value={ifsc} onChange={e => setIfsc(e.target.value)} />
            <input className={inputClass} placeholder={t('account_last4')} maxLength={4} value={last4} onChange={e => setLast4(e.target.value)} />
            <button onClick={saveBank} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
        {showAdd && tab === 'loans' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <select className={inputClass} value={loanType} onChange={e => setLoanType(e.target.value)}>
              <option value="">{t('loan_type')}</option>
              {loanTypes.map(lt => <option key={lt} value={lt}>{t(lt)}</option>)}
            </select>
            <input className={inputClass} type="number" placeholder={t('monthly_emi')} value={emi} onChange={e => setEmi(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('outstanding_amount')} value={outstanding} onChange={e => setOutstanding(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('interest_rate')} value={rate} onChange={e => setRate(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('remaining_tenure')} value={tenure} onChange={e => setTenure(e.target.value)} />
            <input className={inputClass} type="date" placeholder={t('due_date')} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <button onClick={saveLoan} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 'banks' && (
        banks.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {banks.map(b => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Landmark size={20} className="text-primary" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{b.bankName}</p>
                    <p className="text-muted-foreground text-xs">IFSC: {b.ifscCode}</p>
                    <p className="text-muted-foreground text-xs">****{b.accountLast4}</p>
                  </div>
                </div>
                <button onClick={() => deleteBank(b.id)} className="text-destructive text-xs">{t('delete')}</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'loans' && (
        loans.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {loans.map(l => (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-accent" />
                    <p className="font-semibold text-foreground text-sm">{t(l.loanType)}</p>
                  </div>
                  <button onClick={() => deleteLoan(l.id)} className="text-destructive text-xs">{t('delete')}</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>{t('monthly_emi')}: ₹{l.monthlyEmi}</p>
                  <p>{t('outstanding_amount')}: ₹{l.outstandingAmount}</p>
                  <p>{t('interest_rate')}: {l.interestRate}%</p>
                  <p>{t('remaining_tenure')}: {l.remainingTenure}m</p>
                  <p>{t('due_date')}: {l.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Banking;
