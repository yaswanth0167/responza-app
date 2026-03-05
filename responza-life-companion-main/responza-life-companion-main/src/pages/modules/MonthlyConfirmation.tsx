import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { CalendarCheck, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const MonthlyConfirmation = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const db = getDb();
  const confirmations = db.monthlyConfirmations.filter(c => c.userId === user?.id);
  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const handleConfirm = async () => {
    const exists = confirmations.find(c => c.month === month && c.year === year);
    if (exists) { toast.error('Already confirmed for this month'); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/monthly/confirm?month=${month}&year=${year}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to confirm monthly data');
        return;
      }
    } catch {
      toast.error('Network error while confirming monthly data');
      return;
    }

    updateDb(db => ({
      ...db,
      monthlyConfirmations: [...db.monthlyConfirmations, {
        id: generateId(), userId: user!.id, month, year, financialDataConfirmed: true,
        createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('financial_confirmed') + ' ✓');
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('monthly_confirm')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <div className="flex gap-3">
              <input className={inputClass} type="number" placeholder={t('month')} min={1} max={12} value={month} onChange={e => setMonth(+e.target.value)} />
              <input className={inputClass} type="number" placeholder={t('year')} value={year} onChange={e => setYear(+e.target.value)} />
            </div>
            <button onClick={handleConfirm} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('submit')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmations.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
        <div className="space-y-2">
          {confirmations.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <CalendarCheck size={20} className="text-success" />
              <div>
                <p className="font-semibold text-foreground text-sm">{c.month}/{c.year}</p>
                <p className="text-success text-xs">{t('financial_confirmed')} ✓</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyConfirmation;
