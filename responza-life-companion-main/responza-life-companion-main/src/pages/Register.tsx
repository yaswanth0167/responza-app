import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId, User } from '@/store/database';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

const Register = () => {
  const { t } = useTranslation();
  const { lang } = useTranslation();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Step 2
  const [fatherName, setFatherName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // Step 3 - Security
  const [favColour, setFavColour] = useState('');
  const [favPlace, setFavPlace] = useState('');

  // Step 4 - Nominee
  const [nomName, setNomName] = useState('');
  const [nomRelation, setNomRelation] = useState('');
  const [nomContact, setNomContact] = useState('');
  const [nomAltContact, setNomAltContact] = useState('');
  const [nomEmail, setNomEmail] = useState('');

  const inputClass = "w-full p-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-none";

  const normalizeMobile = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (value.startsWith('+')) return value;
    return `+${digits}`;
  };

  const sendOtp = async () => {
    if (mobile.replace(/\D/g, '').length < 10) { toast.error('Invalid mobile'); return; }
    setSendingOtp(true);
    try {
      const response = await fetch(`${API_BASE}/otp/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: normalizeMobile(mobile),
          purpose: 'registration',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || 'Failed to send OTP');
        return;
      }
      setOtpSent(true);
      toast.success(t('otp_sent'));
    } catch {
      toast.error('Network error while sending OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) { toast.error('Enter OTP'); return; }
    setVerifyingOtp(true);
    try {
      const response = await fetch(`${API_BASE}/otp/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: normalizeMobile(mobile),
          otp_code: otp,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || 'Invalid OTP');
        return;
      }
      setMobileVerified(true);
      toast.success('Mobile verified');
    } catch {
      toast.error('Network error while verifying OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const goStep2 = () => {
    if (!firstName || !lastName || !dob || !gender || !address || !email || !mobileVerified) {
      toast.error(t('login_failed'));
      return;
    }
    setStep(2);
  };

  const goStep3 = () => {
    if (!fatherName || !username || !password || password !== confirmPwd) {
      toast.error(t('login_failed'));
      return;
    }
    setStep(3);
  };

  const goStep4 = () => {
    if (!favColour || !fatherName || !favPlace) {
      toast.error(t('login_failed'));
      return;
    }
    setStep(4);
  };

  const handleComplete = async () => {
    if (!nomName || !nomRelation || !nomContact || !nomEmail) {
      toast.error(t('login_failed'));
      return;
    }

    const formData = {
      first_name: firstName,
      last_name: lastName,
      dob,
      gender,
      address,
      email,
      mobile_number: normalizeMobile(mobile),
      username,
      password,
      preferred_language: lang,
      father_name: fatherName,
      favourite_colour: favColour,
      favourite_place: favPlace,
      nominee: {
        name: nomName,
        relationship: nomRelation,
        contactNumber: normalizeMobile(nomContact),
        altContact: nomAltContact ? normalizeMobile(nomAltContact) : "",
        email: nomEmail,
      },
    };

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const newUser: User = {
          id: data.user_id,
          firstName, lastName, dob, gender, address, email, mobile,
          fatherName, username, password,
          favouriteColour: favColour,
          favouritePlace: favPlace,
          preferredLanguage: lang,
          nominee: { name: nomName, relationship: nomRelation, contactNumber: nomContact, altContact: nomAltContact, email: nomEmail },
        };
        setUser(newUser);
        localStorage.setItem('responza_auth', JSON.stringify(newUser));
        toast.success(t('registration_completed'));
        navigate('/dashboard');
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Network error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('register')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('step')} {step} {t('of')} 4</p>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 mb-6">
          <div className="gradient-primary h-2 rounded-full transition-all" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <input className={inputClass} placeholder={t('first_name')} value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className={inputClass} placeholder={t('last_name')} value={lastName} onChange={e => setLastName(e.target.value)} />
            <input className={inputClass} type="date" value={dob} onChange={e => setDob(e.target.value)} />
            <select className={inputClass} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">{t('gender')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
            </select>
            <input className={inputClass} placeholder={t('address')} value={address} onChange={e => setAddress(e.target.value)} />
            <input className={inputClass} type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} />
            <div className="flex gap-2">
              <input className={inputClass} placeholder={t('mobile')} value={mobile} onChange={e => setMobile(e.target.value)} />
              {!mobileVerified && <button onClick={sendOtp} disabled={sendingOtp} className="gradient-primary text-primary-foreground px-4 rounded-lg text-sm whitespace-nowrap disabled:opacity-60">{sendingOtp ? '...' : 'OTP'}</button>}
            </div>
            {otpSent && !mobileVerified && (
              <div className="flex gap-2">
                <input className={inputClass} placeholder={t('enter_otp')} value={otp} onChange={e => setOtp(e.target.value)} />
                <button onClick={verifyOtp} disabled={verifyingOtp} className="gradient-primary text-primary-foreground px-4 rounded-lg text-sm disabled:opacity-60">{verifyingOtp ? '...' : t('verify_otp')}</button>
              </div>
            )}
            {mobileVerified && <p className="text-success text-sm">âœ“ Mobile verified</p>}
            <button onClick={goStep2} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('next')}</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <input className={inputClass} placeholder={t('father_name')} value={fatherName} onChange={e => setFatherName(e.target.value)} />
            <input className={inputClass} placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)} />
            <input className={inputClass} type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} />
            <input className={inputClass} type="password" placeholder={t('confirm_password')} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold border border-border text-foreground">{t('back')}</button>
              <button onClick={goStep3} className="flex-1 gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('next')}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">{t('security_questions')}</h3>
            <input className={inputClass} placeholder={t('favourite_colour')} value={favColour} onChange={e => setFavColour(e.target.value)} />
            <input className={`${inputClass} opacity-60`} placeholder={t('father_name')} value={fatherName} readOnly />
            <input className={inputClass} placeholder={t('favourite_place')} value={favPlace} onChange={e => setFavPlace(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl font-semibold border border-border text-foreground">{t('back')}</button>
              <button onClick={goStep4} className="flex-1 gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('next')}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">{t('nominee_registration')}</h3>
            <input className={inputClass} placeholder={t('nominee_name')} value={nomName} onChange={e => setNomName(e.target.value)} />
            <input className={inputClass} placeholder={t('relationship')} value={nomRelation} onChange={e => setNomRelation(e.target.value)} />
            <input className={inputClass} placeholder={t('contact_number')} value={nomContact} onChange={e => setNomContact(e.target.value)} />
            <input className={inputClass} placeholder={t('alt_contact')} value={nomAltContact} onChange={e => setNomAltContact(e.target.value)} />
            <input className={inputClass} type="email" placeholder={t('nominee_email')} value={nomEmail} onChange={e => setNomEmail(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-semibold border border-border text-foreground">{t('back')}</button>
              <button onClick={handleComplete} className="flex-1 gradient-primary text-primary-foreground py-3 rounded-xl font-semibold">{t('submit')}</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Register;

