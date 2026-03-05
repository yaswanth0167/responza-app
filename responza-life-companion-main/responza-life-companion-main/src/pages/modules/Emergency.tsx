import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { toast } from 'sonner';
import { Plus, X, AlertTriangle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

const emergencyTypes = ['medical', 'accident', 'financial', 'safety', 'natural_disaster'];

const Emergency = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);

  const db = getDb();
  const records = db.emergencyRecords.filter(e => e.userId === user?.id);
  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setGettingLocation(false);
          toast.success('Location captured ✓');
        },
        () => {
          setGettingLocation(false);
          toast.error('Could not get location');
        }
      );
    }
  };

  const handleSave = async () => {
    if (!type) { toast.error(t('login_failed')); return; }

    const token = localStorage.getItem('responza_token');
    if (!token) {
      toast.error('Login required');
      return;
    }

    const emergencyTypeMap: Record<string, string> = {
      medical: 'Medical',
      accident: 'Accident',
      financial: 'Financial',
      safety: 'Threat',
      natural_disaster: 'Threat',
    };

    try {
      const response = await fetch(`${API_BASE}/emergency/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: location || 'Unknown',
          emergency_type: emergencyTypeMap[type] || 'Threat',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || data?.message || 'Failed to trigger emergency');
        return;
      }
    } catch {
      toast.error('Network error while triggering emergency');
      return;
    }

    updateDb(db => ({
      ...db,
      emergencyRecords: [...db.emergencyRecords, {
        id: generateId(), userId: user!.id, type, location,
        latitude: lat, longitude: lng, createdAt: new Date().toISOString(),
      }],
    }));
    toast.success(t('save') + ' ✓');
    setShowAdd(false); setType(''); setLocation(''); setLat(0); setLng(0);
  };

  const handleDelete = (id: string) => { updateDb(db => ({ ...db, emergencyRecords: db.emergencyRecords.filter(e => e.id !== id) })); toast.success(t('delete') + ' ✓'); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('emergency')}</h1>
        <button onClick={() => { setShowAdd(true); getLocation(); }} className="gradient-primary text-primary-foreground p-3 rounded-xl"><Plus size={20} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 mb-4 space-y-3">
            <div className="flex justify-between"><h3 className="font-semibold text-foreground">{t('add_new')}</h3><button onClick={() => setShowAdd(false)}><X size={18} className="text-muted-foreground" /></button></div>
            <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
              <option value="">{t('emergency_type')}</option>
              {emergencyTypes.map(et => <option key={et} value={et}>{t(et)}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <p className="text-sm text-foreground">{gettingLocation ? 'Getting location...' : location || 'No location'}</p>
            </div>
            {lat !== 0 && <p className="text-xs text-muted-foreground">Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}</p>}
            <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('save')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {records.length === 0 ? <p className="text-muted-foreground text-center py-10">{t('no_data')}</p> : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-warning" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{t(r.type)}</p>
                  <p className="text-muted-foreground text-xs">{r.location}</p>
                  <p className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString()}</p>
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

export default Emergency;
