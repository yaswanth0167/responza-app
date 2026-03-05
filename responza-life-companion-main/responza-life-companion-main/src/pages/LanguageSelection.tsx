import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { Globe } from 'lucide-react';

const langs = [
  { code: 'en' as const, label: 'English', native: 'English' },
  { code: 'te' as const, label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi' as const, label: 'Hindi', native: 'हिन्दी' },
];

const LanguageSelection = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useTranslation();

  const handleSelect = (code: 'en' | 'te' | 'hi') => {
    setLang(code);
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 md:p-12 max-w-md w-full text-center"
      >
        <Globe className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('select_language')}</h1>

        <div className="space-y-3 mb-8">
          {langs.map((l, i) => (
            <motion.button
              key={l.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleSelect(l.code)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left flex justify-between items-center ${
                lang === l.code
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-primary/50 text-foreground'
              }`}
            >
              <span className="font-semibold">{l.native}</span>
              <span className="text-muted-foreground text-sm">{l.label}</span>
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
          className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold text-lg"
        >
          {t('continue')}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default LanguageSelection;
