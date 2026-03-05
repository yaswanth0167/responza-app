import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb } from '@/store/database';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const { login, nomineeLogin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'user' | 'nominee'>('user');
  const [showPwd, setShowPwd] = useState(false);

  // User login
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Nominee login
  const [nomMobile, setNomMobile] = useState('');
  const [nomDob, setNomDob] = useState('');
  const [nomFather, setNomFather] = useState('');

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(0);
  const [fColour, setFColour] = useState('');
  const [fFather, setFFather] = useState('');
  const [fPlace, setFPlace] = useState('');
  const [forgotUser, setForgotUser] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const handleUserLogin = async () => {
    if (!usernameOrEmail || !password) {
      toast.error(t('login_failed'));
      return;
    }
    const result = await login(usernameOrEmail, password);
    if (result.success) {
      toast.success(t('welcome_back'));
      navigate('/dashboard');
    } else {
      toast.error(result.error || t('login_failed'));
    }
  };

  const handleNomineeLogin = async () => {
    if (!nomMobile || !nomDob || !nomFather) {
      toast.error(t('login_failed'));
      return;
    }
    const result = await nomineeLogin(nomMobile, nomDob, nomFather);
    if (result.success) {
      toast.success(t('welcome_back'));
      navigate('/dashboard');
    } else {
      toast.error(result.error || t('login_failed'));
    }
  };

  const handleForgotSubmitSecurity = () => {
    const db = getDb();
    const found = db.users.find(
      u => u.favouriteColour.toLowerCase() === fColour.toLowerCase() &&
        u.fatherName.toLowerCase() === fFather.toLowerCase() &&
        u.favouritePlace.toLowerCase() === fPlace.toLowerCase()
    );
    if (found) {
      setForgotUser(found);
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedOtp(code);
      toast.success(`${t('otp_sent')} (${found.mobile}): ${code}`);
      setForgotStep(1);
    } else {
      toast.error(t('login_failed'));
    }
  };

  const handleForgotOtp = () => {
    if (otp === generatedOtp) {
      setForgotStep(2);
    } else {
      toast.error('Invalid OTP');
    }
  };

  const handleResetPassword = () => {
    if (!newPwd || newPwd !== confirmPwd) {
      toast.error(t('login_failed'));
      return;
    }
    updateDb(db => ({
      ...db,
      users: db.users.map(u => u.id === forgotUser.id ? { ...u, password: newPwd } : u),
    }));
    toast.success(t('reset_password') + ' ✓');
    setShowForgot(false);
    setForgotStep(0);
  };

  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  if (showForgot) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-foreground mb-6">{t('forgot_password')}</h2>

          {forgotStep === 0 && (
            <div className="space-y-4">
              <input className={inputClass} placeholder={t('favourite_colour')} value={fColour} onChange={e => setFColour(e.target.value)} />
              <input className={inputClass} placeholder={t('father_name')} value={fFather} onChange={e => setFFather(e.target.value)} />
              <input className={inputClass} placeholder={t('favourite_place')} value={fPlace} onChange={e => setFPlace(e.target.value)} />
              <button onClick={handleForgotSubmitSecurity} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('submit')}</button>
            </div>
          )}
          {forgotStep === 1 && (
            <div className="space-y-4">
              <input className={inputClass} placeholder={t('enter_otp')} value={otp} onChange={e => setOtp(e.target.value)} />
              <button onClick={handleForgotOtp} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('verify_otp')}</button>
            </div>
          )}
          {forgotStep === 2 && (
            <div className="space-y-4">
              <input className={inputClass} type="password" placeholder={t('new_password')} value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              <input className={inputClass} type="password" placeholder={t('confirm_password')} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              <button onClick={handleResetPassword} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('reset_password')}</button>
            </div>
          )}
          <button onClick={() => { setShowForgot(false); setForgotStep(0); }} className="mt-4 text-primary underline text-sm">{t('back')}</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold gradient-text text-center mb-6">Responza</h1>

        {/* Tabs */}
        <div className="flex mb-6 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setTab('user')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'user' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {t('user_login')}
          </button>
          <button
            onClick={() => setTab('nominee')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'nominee' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {t('nominee_login')}
          </button>
        </div>

        {tab === 'user' ? (
          <div className="space-y-4">
            <input className={inputClass} placeholder={t('username_or_email')} value={usernameOrEmail} onChange={e => setUsernameOrEmail(e.target.value)} />
            <div className="relative">
              <input className={inputClass} type={showPwd ? 'text' : 'password'} placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserLogin()} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-muted-foreground">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button onClick={handleUserLogin} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('login')}</button>
            <div className="flex justify-between text-sm">
              <button onClick={() => setShowForgot(true)} className="text-primary hover:underline">{t('forgot_password')}</button>
              <button onClick={() => navigate('/register')} className="text-primary hover:underline">{t('new_user')}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input className={inputClass} placeholder={t('main_user_mobile')} value={nomMobile} onChange={e => setNomMobile(e.target.value)} />
            <input className={inputClass} type="date" placeholder={t('date_of_birth')} value={nomDob} onChange={e => setNomDob(e.target.value)} />
            <input className={inputClass} placeholder={t('father_name')} value={nomFather} onChange={e => setNomFather(e.target.value)} />
            <button onClick={handleNomineeLogin} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('login')}</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
