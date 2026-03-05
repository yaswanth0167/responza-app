import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Heart, Plus, X, Upload, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const Health = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [records, setRecords] = useState('');

  const db = getDb();
  const members = db.healthRecords.filter(h => h.userId === user?.id);

  const inputClass = "w-full p-3 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200";

  const resetForm = () => {
    setName(''); setAge(''); setBloodGroup(''); setAllergies(''); setConditions(''); setRecords('');
    setEditId(null); setShowForm(false);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (id: string) => {
    const m = members.find(h => h.id === id);
    if (!m) return;
    setEditId(id);
    setName(m.memberName || '');
    setAge(String(m.age || ''));
    setBloodGroup(m.bloodGroup);
    setAllergies(m.allergies);
    setConditions(m.medicalConditions);
    setRecords(m.medicalRecords);
    setShowForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRecords(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name || !bloodGroup) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/health/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          blood_group: bloodGroup,
          allergies,
          medical_conditions: conditions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to save health record');
        return;
      }
    } catch {
      toast.error('Network error while saving health record');
      return;
    }

    const entry = {
      id: editId || generateId(),
      userId: user!.id,
      memberName: name,
      age: +age || 0,
      bloodGroup,
      allergies,
      medicalConditions: conditions,
      medicalRecords: records,
    };
    updateDb(db => ({
      ...db,
      healthRecords: editId
        ? db.healthRecords.map(h => h.id === editId ? entry : h)
        : [...db.healthRecords, entry],
    }));
    toast.success(t('save') + ' ✓');
    resetForm();
  };

  const handleDelete = (id: string) => {
    updateDb(db => ({ ...db, healthRecords: db.healthRecords.filter(h => h.id !== id) }));
    toast.success(t('delete') + ' ✓');
  };

  // Health risk score: based on conditions & allergies count
  const riskScore = members.reduce((score, m) => {
    let s = 0;
    if (m.medicalConditions) s += m.medicalConditions.split(',').length * 15;
    if (m.allergies) s += m.allergies.split(',').length * 10;
    return score + s;
  }, 0);
  const riskLevel = riskScore < 20 ? t('low') : riskScore < 50 ? t('medium') : t('high');
  const riskColor = riskScore < 20 ? 'text-success' : riskScore < 50 ? 'text-warning' : 'text-destructive';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heart size={28} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('health')}</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAdd} className="gradient-primary text-primary-foreground p-3 rounded-xl shadow-lg">
          <Plus size={20} />
        </motion.button>
      </div>

      {/* Health Risk Score */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{t('health_risk_score')}</p>
          <p className={`text-2xl font-bold ${riskColor}`}>{riskLevel}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">{t('members_count')}: {members.length}</p>
          <p className="text-muted-foreground text-xs">{t('risk_score')}: {riskScore}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">{editId ? t('edit') : t('add_new')}</h3>
              <button onClick={resetForm}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <input className={inputClass} placeholder={t('member_name')} value={name} onChange={e => setName(e.target.value)} />
            <input className={inputClass} type="number" placeholder={t('age')} value={age} onChange={e => setAge(e.target.value)} />
            <select className={inputClass} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
              <option value="">-- {t('blood_group')} --</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
            <textarea className={inputClass} rows={2} placeholder={t('allergies')} value={allergies} onChange={e => setAllergies(e.target.value)} />
            <textarea className={inputClass} rows={3} placeholder={t('medical_conditions')} value={conditions} onChange={e => setConditions(e.target.value)} />
            <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-xl cursor-pointer text-muted-foreground hover:border-primary transition-colors">
              <Upload size={18} /><span>{t('upload_document')}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            </label>
            {records && <p className="text-success text-sm">✓ {t('file_attached')}</p>}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg">
              {t('save')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members List */}
      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">{t('no_data')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {(m.memberName || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{m.memberName || '-'}</p>
                    <p className="text-muted-foreground text-xs">{t('age')}: {m.age || '-'} • {m.bloodGroup}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(m.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 size={14} className="text-primary" /></button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                </div>
              </div>
              {m.allergies && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('allergies')}:</span> {m.allergies}</p>}
              {m.medicalConditions && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">{t('medical_conditions')}:</span> {m.medicalConditions}</p>}
              {m.medicalRecords && <img src={m.medicalRecords} className="mt-3 rounded-xl max-h-28 w-full object-cover" alt="record" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Health;
