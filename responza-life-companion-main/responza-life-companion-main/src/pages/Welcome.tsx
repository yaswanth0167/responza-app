import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { useEffect, useState } from 'react';

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 3,
    }))
  );

  return (
    <div className="relative min-h-screen overflow-hidden gradient-primary flex items-center justify-center">
      {/* Animated particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary-foreground/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Center card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="glass rounded-2xl p-10 md:p-14 text-center max-w-md mx-4 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-3">
            Responza
          </h1>
          <p className="text-muted-foreground text-lg mb-10">
            {t('tagline')}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/language')}
          className="gradient-primary text-primary-foreground px-10 py-4 rounded-xl text-lg font-semibold glow-primary transition-all duration-300 hover:shadow-2xl"
        >
          {t('get_started')}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Welcome;
