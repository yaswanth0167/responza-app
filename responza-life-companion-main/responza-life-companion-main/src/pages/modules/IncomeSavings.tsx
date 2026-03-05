import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { DollarSign, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const IncomeSavings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [emergencyFund, setEmergencyFund] = useState('');
  const [dependents, setDependents] = useState('');

  const db = getDb();
  const records = db.incomeSavings.filter(i => i.userId === user?.id);

  const inputClass = "w-full p-3 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200";

  const resetForm = () => {
    setMonthlyIncome(''); setOtherIncome(''); setMonthlyExpenses('');
    setCurrentSavings(''); setEmergencyFund(''); setDependents('');
    setEditId(null); setShowForm(false);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (id: string) => {
    const r = records.find(i => i.id === id);
    if (!r) return;
    setEditId(id);
    setMonthlyIncome(String(r.monthlyIncome));
    setOtherIncome(String(r.otherIncome));
    setMonthlyExpenses(String(r.monthlyExpenses));
    setCurrentSavings(String(r.currentSavings));
    setEmergencyFund(String(r.emergencyFund));
    setDependents(String(r.dependents));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!monthlyIncome) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    const payload = {
      monthly_income: +monthlyIncome,
      other_income: +otherIncome || 0,
      monthly_expenses: +monthlyExpenses || 0,
      current_savings: +currentSavings || 0,
      emergency_fund: +emergencyFund || 0,
      dependents: +dependents || 0,
    };

    try {
      const response = await fetch(`${API_BASE}/income/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save income');
        return;
      }
    } catch {
      toast.error('Network error while saving income');
      return;
    }

    const entry = {
      id: editId || generateId(),
      userId: user!.id,
      monthlyIncome: +monthlyIncome, otherIncome: +otherIncome, monthlyExpenses: +monthlyExpenses,
      currentSavings: +currentSavings, emergencyFund: +emergencyFund, dependents: +dependents,
    };
    updateDb(db => ({
      ...db,
      incomeSavings: editId
        ? db.incomeSavings.map(i => i.id === editId ? entry : i)
        : [...db.incomeSavings, entry],
    }));
    toast.success(t('save') + ' ✓');
    resetForm();
  };

  const handleDelete = (id: string) => {
    updateDb(db => ({ ...db, incomeSavings: db.incomeSavings.filter(i => i.id !== id) }));
    toast.success(t('delete') + ' ✓');
  };

  // Aggregated stats
  const totalIncome = records.reduce((s, r) => s + r.monthlyIncome + r.otherIncome, 0);
  const totalSavings = records.reduce((s, r) => s + r.currentSavings, 0);
  const totalEmergency = records.reduce((s, r) => s + r.emergencyFund, 0);
  const emergencyRatio = totalIncome > 0 ? ((totalEmergency / totalIncome) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign size={28} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('income_savings')}</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAdd} className="gradient-primary text-primary-foreground p-3 rounded-xl shadow-lg">
          <Plus size={20} />
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('income'), value: `₹${totalIncome.toLocaleString()}`, color: 'text-success' },
          { label: t('total_savings'), value: `₹${totalSavings.toLocaleString()}`, color: 'text-info' },
          { label: t('emergency_fund'), value: `₹${totalEmergency.toLocaleString()}`, color: 'text-warning' },
          { label: t('emergency_ratio'), value: `${emergencyRatio}%`, color: 'text-primary' },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-4">
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className={`font-bold text-lg ${c.color}`}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">{editId ? t('edit') : t('add_new')}</h3>
              <button onClick={resetForm}><X size={18} className="text-muted-foreground" /></button>
            </div>
            {[
              [t('monthly_income'), monthlyIncome, setMonthlyIncome],
              [t('other_income'), otherIncome, setOtherIncome],
              [t('monthly_expenses'), monthlyExpenses, setMonthlyExpenses],
              [t('current_savings'), currentSavings, setCurrentSavings],
              [t('emergency_fund'), emergencyFund, setEmergencyFund],
              [t('dependents'), dependents, setDependents],
            ].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="text-sm font-medium text-foreground mb-1 block">{label as string}</label>
                <input className={inputClass} type="number" value={val as string} onChange={e => (setter as any)(e.target.value)} />
              </div>
            ))}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg">
              {t('save')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records List */}
      {records.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">{t('no_data')}</p>
      ) : (
        <div className="space-y-3">
          {records.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <DollarSign size={18} className="text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">₹{(r.monthlyIncome + r.otherIncome).toLocaleString()} / {t('month')}</p>
                    <p className="text-muted-foreground text-xs">{t('dependents')}: {r.dependents}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 size={14} className="text-primary" /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">{t('monthly_expenses')}:</span> <span className="text-foreground font-medium">₹{r.monthlyExpenses.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">{t('current_savings')}:</span> <span className="text-foreground font-medium">₹{r.currentSavings.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">{t('emergency_fund')}:</span> <span className="text-foreground font-medium">₹{r.emergencyFund.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">{t('other_income')}:</span> <span className="text-foreground font-medium">₹{r.otherIncome.toLocaleString()}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncomeSavings;
