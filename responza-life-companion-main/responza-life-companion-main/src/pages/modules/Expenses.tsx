import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Plus, X, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const categories = ['food', 'rent', 'travel', 'emi', 'entertainment'];

const Expenses = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const db = getDb();
  const expenses = db.expenses.filter(e => e.userId === user?.id);
  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSave = async () => {
    if (!category || !amount) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    const monthlyExpenses = expenses.filter(e => e.month === month && e.year === year);
    const categoriesPayload: Record<string, number> = {};
    monthlyExpenses.forEach((e) => {
      categoriesPayload[e.category] = (categoriesPayload[e.category] || 0) + e.amount;
    });
    categoriesPayload[category] = (categoriesPayload[category] || 0) + (+amount || 0);

    try {
      const response = await fetch(`${API_BASE}/expense/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month,
          year,
          categories: categoriesPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.status === 'error') {
        toast.error(data?.detail || data?.message || 'Failed to save expense');
        return;
      }
    } catch {
      toast.error('Network error while saving expense');
      return;
    }

    updateDb(db => ({
      ...db,
      expenses: [...db.expenses, { id: generateId(), userId: user!.id, month, year, category, amount: +amount, createdAt: new Date().toISOString() }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setCategory(''); setAmount('');
  };

  const handleDelete = (id: string) => { updateDb(db => ({ ...db, expenses: db.expenses.filter(e => e.id !== id) })); toast.success(t('delete') + ' ✓'); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('expenses')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-muted-foreground text-sm">{t('total_expenses')}</p>
        <p className="text-2xl font-bold text-foreground">₹{total.toLocaleString()}</p>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <div className="flex gap-3">
              <input className={inputClass} type="number" placeholder={t('month')} min={1} max={12} value={month} onChange={e => setMonth(+e.target.value)} />
              <input className={inputClass} type="number" placeholder={t('year')} value={year} onChange={e => setYear(+e.target.value)} />
            </div>
            <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{t('category')}</option>
              {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <input className={inputClass} type="number" placeholder={t('amount')} value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {expenses.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Receipt size={18} className="text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">{t(e.category)}</p>
                  <p className="text-muted-foreground text-xs">{e.month}/{e.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-foreground">₹{e.amount.toLocaleString()}</p>
                <button onClick={() => handleDelete(e.id)} className="text-destructive text-xs">{t('delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Expenses;
