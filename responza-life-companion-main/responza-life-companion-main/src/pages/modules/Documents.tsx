import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId, Document } from '@/store/database';
import { toast } from 'sonner';
import { Plus, FileText, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const docCategories = [
  'aadhar_card', 'birth_certificate', 'pan_card', 'voter_id', 'driving_licence',
  'ration_card', 'passport', 'class_7th', 'class_10th', 'class_12th',
  'btech', 'higher_degree', 'achievements', 'caste_certificate', 'income_certificate',
];

const Documents = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('');
  const [docName, setDocName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [fileData, setFileData] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const db = getDb();
  const docs = db.documents.filter(d => d.userId === user?.id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setFileData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!category || !docName || !docNumber) { toast.error(t('login_failed')); return; }
    const token = localStorage.getItem('responza_token');
    if (!token) { toast.error('Login required'); return; }
    if (!selectedFile) { toast.error('Please attach a file'); return; }

    try {
      const uploadData = new FormData();
      uploadData.append('doc_type', category);
      uploadData.append('file', selectedFile);

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data?.detail || data?.message || 'Failed to upload document'); return; }
    } catch {
      toast.error('Network error while uploading document');
      return;
    }

    updateDb(db => ({
      ...db,
      documents: [...db.documents, {
        id: generateId(), userId: user!.id, category, name: docName, number: docNumber,
        fileData, createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('save') + ' âœ“');
    setShowAdd(false);
    setCategory(''); setDocName(''); setDocNumber(''); setFileData(''); setSelectedFile(null);
  };

  const handleDelete = (id: string) => {
    updateDb(db => ({ ...db, documents: db.documents.filter(d => d.id !== id) }));
    toast.success(t('delete') + ' âœ“');
  };

  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('documents')}</h1>
        <button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground p-3 rounded-xl">
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-xl p-6 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">{t('add_new')}</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{t('category')}</option>
              {docCategories.map(c => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <input className={inputClass} placeholder={t('document_name')} value={docName} onChange={e => setDocName(e.target.value)} />
            <input className={inputClass} placeholder={t('document_number')} value={docNumber} onChange={e => setDocNumber(e.target.value)} />
            <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer text-muted-foreground hover:border-primary">
              <Upload size={18} />
              <span>{t('upload_document')}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
            </label>
            {fileData && <p className="text-success text-sm">âœ“ File attached</p>}
            <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {docs.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">{t('no_data')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map(doc => (
            <motion.div key={doc.id} layout className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t(doc.category)}</p>
                    <p className="text-muted-foreground text-xs">{doc.name}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(doc.id)} className="text-destructive text-xs">{t('delete')}</button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">#{doc.number}</p>
              {doc.fileData && (
                <img src={doc.fileData} className="mt-2 rounded-lg max-h-32 w-full object-cover" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;

