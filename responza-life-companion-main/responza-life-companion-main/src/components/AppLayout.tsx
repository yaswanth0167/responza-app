import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, FileText, Landmark, Shield, Heart, 
  DollarSign, Receipt, AlertTriangle, Bell, HandCoins, 
  CalendarCheck, LogOut, Menu
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/modules/documents', icon: FileText, key: 'documents' },
  { path: '/modules/banking', icon: Landmark, key: 'banking' },
  { path: '/modules/insurance', icon: Shield, key: 'insurance' },
  { path: '/modules/health', icon: Heart, key: 'health' },
  { path: '/modules/income', icon: DollarSign, key: 'income_savings' },
  { path: '/modules/expenses', icon: Receipt, key: 'expenses' },
  { path: '/modules/emergency', icon: AlertTriangle, key: 'emergency' },
  { path: '/modules/reminders', icon: Bell, key: 'reminders' },
  { path: '/modules/lending', icon: HandCoins, key: 'lending' },
  { path: '/modules/monthly', icon: CalendarCheck, key: 'monthly_confirm' },
];

const AppLayout = () => {
  const { t, lang, setLang } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 glass z-50 transition-transform duration-300 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-5 border-b border-border/50">
          <h1 className="text-xl font-bold gradient-text">Responza</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{user?.firstName} {user?.lastName}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'gradient-primary text-primary-foreground shadow-lg' 
                    : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                }`
              }
            >
              <item.icon size={18} />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border/50 space-y-2">
          <select
            value={lang}
            onChange={e => setLang(e.target.value as any)}
            className="w-full p-2 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          >
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors">
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <header className="md:hidden sticky top-0 z-30 glass border-b border-border/50 p-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <Menu size={22} className="text-foreground" />
          </button>
          <h1 className="font-bold gradient-text text-lg">Responza</h1>
          <div className="w-10" />
        </header>
        <div className="p-4 md:p-6 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
