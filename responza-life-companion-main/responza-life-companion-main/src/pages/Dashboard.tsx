import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDb, updateDb, generateId } from '@/store/database';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, CreditCard, Shield, Bell, Heart, Activity } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { migrateLocalDataToBackend } from '@/lib/localMigration';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mlRisk, setMlRisk] = useState<null | { risk_category: string; cluster: number }>(null);
  const [syncing, setSyncing] = useState(false);

  const db = getDb();
  const loans = db.loans.filter(l => l.userId === user?.id);
  const allIncomeSavings = db.incomeSavings.filter(i => i.userId === user?.id);
  const expenses = db.expenses.filter(e => e.userId === user?.id);
  const insurance = db.insurance.filter(i => i.userId === user?.id);
  const reminders = db.reminders.filter(r => r.userId === user?.id);
  const healthRecords = db.healthRecords.filter(h => h.userId === user?.id);

  // Auto-generate reminders
  useEffect(() => {
    if (!user) return;
    const existingMessages = new Set(db.reminders.filter(r => r.userId === user.id).map(r => r.message));
    const newReminders: any[] = [];

    loans.forEach(loan => {
      const msg = `EMI Due: ${t(loan.loanType)} - ₹${loan.monthlyEmi} on ${loan.dueDate}`;
      if (!existingMessages.has(msg)) {
        newReminders.push({ id: generateId(), userId: user.id, message: msg, type: 'EMI', sendAt: loan.dueDate, createdAt: new Date().toISOString() });
      }
    });

    insurance.forEach(ins => {
      const msg = `Premium Due: ${t(ins.type)} - ₹${ins.premiumAmount} on ${ins.premiumDue}`;
      if (!existingMessages.has(msg)) {
        newReminders.push({ id: generateId(), userId: user.id, message: msg, type: 'Insurance', sendAt: ins.premiumDue, createdAt: new Date().toISOString() });
      }
    });

    if (newReminders.length > 0) {
      updateDb(db => ({ ...db, reminders: [...db.reminders, ...newReminders] }));
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchMlRisk = async () => {
      const token = localStorage.getItem('responza_token');
      if (!token || !user) return;

      try {
        const response = await fetch(`${API_BASE}/risk/ml-predict-me`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data?.risk_category !== undefined && data?.cluster !== undefined) {
          setMlRisk({ risk_category: data.risk_category, cluster: data.cluster });
        }
      } catch {
        // Keep dashboard working with local fallback logic if ML API is unavailable.
      }
    };

    fetchMlRisk();
  }, [user?.id]);

  // Aggregate from multiple income/savings records
  const totalMonthlyIncome = allIncomeSavings.reduce((s, r) => s + r.monthlyIncome + r.otherIncome, 0);
  const totalSavings = allIncomeSavings.reduce((s, r) => s + r.currentSavings, 0);
  const totalEmergency = allIncomeSavings.reduce((s, r) => s + r.emergencyFund, 0);

  const totalEmi = loans.reduce((s, l) => s + l.monthlyEmi, 0);
  const totalOutstanding = loans.reduce((s, l) => s + l.outstandingAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Financial health
  const debtToIncome = totalMonthlyIncome > 0 ? (totalEmi / totalMonthlyIncome) * 100 : 0;
  const financialHealth = debtToIncome < 30 ? 'good' : debtToIncome < 50 ? 'moderate' : 'at_risk';
  const riskLevel = debtToIncome < 20 ? 'low' : debtToIncome < 40 ? 'medium' : 'high';
  const emergencyRatio = totalMonthlyIncome > 0 ? ((totalEmergency / totalMonthlyIncome) * 100).toFixed(1) : '0';

  // Health risk score
  const healthRiskScore = healthRecords.reduce((score, m) => {
    let s = 0;
    if (m.medicalConditions) s += m.medicalConditions.split(',').length * 15;
    if (m.allergies) s += m.allergies.split(',').length * 10;
    return score + s;
  }, 0);
  const healthRisk = healthRiskScore < 20 ? t('low') : healthRiskScore < 50 ? t('medium') : t('high');

  // Chart data
  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    return [
      { name: t('income'), income: totalMonthlyIncome, expense: 0 },
      ...Object.entries(byCategory).map(([cat, amt]) => ({ name: t(cat), income: 0, expense: amt })),
    ];
  }, [expenses, totalMonthlyIncome, t]);

  const upcomingReminders = reminders
    .filter(r => new Date(r.sendAt) >= new Date())
    .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())
    .slice(0, 5);

  const healthColor = financialHealth === 'good' ? 'text-success' : financialHealth === 'moderate' ? 'text-warning' : 'text-destructive';
  const riskColor = riskLevel === 'low' ? 'text-success' : riskLevel === 'medium' ? 'text-warning' : 'text-destructive';

  const cards = [
    { icon: DollarSign, label: 'income', value: `₹${totalMonthlyIncome.toLocaleString()}`, color: 'text-success' },
    { icon: CreditCard, label: 'total_loan_emi', value: `₹${totalEmi.toLocaleString()}`, color: 'text-warning' },
    { icon: TrendingUp, label: 'total_savings', value: `₹${totalSavings.toLocaleString()}`, color: 'text-info' },
    { icon: Shield, label: 'financial_health', value: t(financialHealth), color: healthColor },
  ];

  const handleSyncNow = async () => {
    const token = localStorage.getItem('responza_token');
    if (!user || !token) {
      toast.error('Login required');
      return;
    }

    setSyncing(true);
    try {
      const result = await migrateLocalDataToBackend(user.id, token);
      if (result.failures.length === 0) {
        toast.success('Data synced to MongoDB');
      } else {
        toast.error(`Partial sync. Failed: ${result.failures.length}`);
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard')}</h1>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="px-4 py-2 rounded-xl border border-border text-foreground text-sm disabled:opacity-60"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-4">
            <card.icon size={20} className={card.color} />
            <p className="text-muted-foreground text-xs mt-2">{t(card.label)}</p>
            <p className="font-bold text-foreground text-lg">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Risk, Spending & Health */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-3">{t('risk_status')}</h3>
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className={riskColor} />
            <div>
              <p className={`font-bold text-lg ${riskColor}`}>{t(riskLevel)}</p>
              <p className="text-muted-foreground text-xs">Debt-to-Income: {debtToIncome.toFixed(1)}%</p>
              {mlRisk && (
                <p className="text-muted-foreground text-xs">
                  ML: {mlRisk.risk_category} (Cluster {mlRisk.cluster})
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-3">{t('spending_habits')}</h3>
          <p className="text-muted-foreground text-sm">{t('total_expenses')}: ₹{totalExpenses.toLocaleString()}</p>
          <p className="text-muted-foreground text-sm">{t('emergency_fund')}: ₹{totalEmergency.toLocaleString()}</p>
          <p className="text-muted-foreground text-sm">{t('emergency_ratio')}: {emergencyRatio}%</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Heart size={16} className="text-destructive" /> {t('health_risk_score')}</h3>
          <div className="flex items-center gap-3">
            <Activity size={24} className={healthRiskScore < 20 ? 'text-success' : healthRiskScore < 50 ? 'text-warning' : 'text-destructive'} />
            <div>
              <p className={`font-bold text-lg ${healthRiskScore < 20 ? 'text-success' : healthRiskScore < 50 ? 'text-warning' : 'text-destructive'}`}>{healthRisk}</p>
              <p className="text-muted-foreground text-xs">{t('members_count')}: {healthRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-4 mb-6">
        <h3 className="font-semibold text-foreground mb-4">{t('income_vs_expense')}</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="hsl(var(--success))" name={t('income')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" name={t('expenses')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-8">{t('no_data')}</p>
        )}
      </div>

      {/* Active Loans */}
      {loans.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">{t('active_loans')}</h3>
          <div className="space-y-2">
            {loans.map(l => (
              <div key={l.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-foreground text-sm">{t(l.loanType)}</span>
                <span className="text-muted-foreground text-sm">₹{l.monthlyEmi}/mo • {l.remainingTenure}m left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders */}
      <div className="glass rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Bell size={18} className="text-info" />
          {t('alerts_reminders')}
        </h3>
        {upcomingReminders.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('no_data')}</p>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map(r => (
              <div key={r.id} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                <p className="text-foreground text-sm">{r.message}</p>
                <p className="text-muted-foreground text-xs whitespace-nowrap ml-2">{new Date(r.sendAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
