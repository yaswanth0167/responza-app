import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Plus, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const insuranceTypes = ['health_insurance', 'life_insurance', 'vehicle_insurance'];

const Insurance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState('');
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coverage, setCoverage] = useState('');
  const [premium, setPremium] = useState('');
  const [premiumDue, setPremiumDue] = useState('');

  const db = getDb();
  const items = db.insurance.filter(i => i.userId === user?.id);
  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const handleSave = async () => {
    if (!type || !provider || !policyNumber || !coverage || !premium || !premiumDue) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/insurance/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          policy_number: policyNumber,
          coverage_amount: +coverage || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save insurance');
        return;
      }
    } catch {
      toast.error('Network error while saving insurance');
      return;
    }

    updateDb(db => ({
      ...db,
      insurance: [...db.insurance, {
        id: generateId(), userId: user!.id, type, provider, policyNumber,
        coverageAmount: +coverage, premiumAmount: +premium, premiumDue,
        createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setType(''); setProvider(''); setPolicyNumber(''); setCoverage(''); setPremium(''); setPremiumDue('');
  };

  const handleDelete = (id: string) => { updateDb(db => ({ ...db, insurance: db.insurance.filter(i => i.id !== id) })); toast.success(t('delete') + ' ✓'); };

  const maskPolicy = (num: string) => num.length > 4 ? '****' + num.slice(-4) : num;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('insurance')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-6 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
              <option value="">{t('type')}</option>
              {insuranceTypes.map(it => <option key={it} value={it}>{t(it)}</option>)}
            </select>
            <input className={inputClass} placeholder={t('provider')} value={provider} onChange={e => setProvider(e.target.value)} />
            <input className={inputClass} placeholder={t('policy_number')} value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('coverage_amount')} value={coverage} onChange={e => setCoverage(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('premium_amount')} value={premium} onChange={e => setPremium(e.target.value)} />
            <input className={inputClass} type="date" placeholder={t('premium_due')} value={premiumDue} onChange={e => setPremiumDue(e.target.value)} />
            <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(i => (
            <div key={i.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3"><Shield size={20} className="text-primary" /><p className="font-semibold text-foreground text-sm">{t(i.type)}</p></div>
                <button onClick={() => handleDelete(i.id)} className="text-destructive text-xs">{t('delete')}</button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>{t('provider')}: {i.provider}</p>
                <p>{t('policy_number')}: {maskPolicy(i.policyNumber)}</p>
                <p>{t('coverage_amount')}: ₹{i.coverageAmount.toLocaleString()}</p>
                <p>{t('premium_amount')}: ₹{i.premiumAmount.toLocaleString()}</p>
                <p>{t('premium_due')}: {i.premiumDue}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Insurance;
