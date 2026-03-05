import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Plus, X, HandCoins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const Lending = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [returnDate, setReturnDate] = useState('');

  const db = getDb();
  const records = db.lendingRecords.filter(l => l.userId === user?.id);
  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const handleSave = async () => {
    if (!amount || !person || !returnDate) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/lending/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: type === 'lent' ? 'given' : 'taken',
          amount: +amount || 0,
          person,
          expected_return_date: returnDate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save lending record');
        return;
      }
    } catch {
      toast.error('Network error while saving lending record');
      return;
    }

    updateDb(db => ({
      ...db,
      lendingRecords: [...db.lendingRecords, {
        id: generateId(), userId: user!.id, type, amount: +amount, person,
        expectedReturnDate: returnDate, createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setAmount(''); setPerson(''); setReturnDate('');
  };

  const handleDelete = (id: string) => { updateDb(db => ({ ...db, lendingRecords: db.lendingRecords.filter(l => l.id !== id) })); toast.success(t('delete') + ' ✓'); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('lending')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <div className="flex bg-secondary rounded-lg p-1">
              <button onClick={() => setType('lent')} className={`flex-1 py-2 rounded-md text-sm font-semibold ${type === 'lent' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('lent')}</button>
              <button onClick={() => setType('borrowed')} className={`flex-1 py-2 rounded-md text-sm font-semibold ${type === 'borrowed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('borrowed')}</button>
            </div>
            <input className={inputClass} type="number" placeholder={t('amount')} value={amount} onChange={e => setAmount(e.target.value)} />
            <input className={inputClass} placeholder={t('person')} value={person} onChange={e => setPerson(e.target.value)} />
            <input className={inputClass} type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {records.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <HandCoins size={20} className={r.type === 'lent' ? 'text-success' : 'text-warning'} />
                <div>
                  <p className="font-semibold text-foreground text-sm">{t(r.type)} - ₹{r.amount.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">{r.person} • {t('expected_return')}: {r.expectedReturnDate}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-destructive text-xs">{t('delete')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Lending;
