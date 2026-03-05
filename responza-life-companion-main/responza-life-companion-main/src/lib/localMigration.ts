import { API_BASE } from '@/lib/api';
import { getDb } from '@/store/database';

type SyncState = Record<string, Record<string, string[]>>;

const SYNC_KEY = 'responza_synced_records_v1';

function readSyncState(): SyncState {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}') as SyncState;
  } catch {
    return {};
  }
}

function writeSyncState(state: SyncState) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(state));
}

function markSynced(userId: string, section: string, ids: string[]) {
  const state = readSyncState();
  const userState = state[userId] || {};
  const existing = new Set(userState[section] || []);
  ids.forEach((id) => existing.add(id));
  userState[section] = Array.from(existing);
  state[userId] = userState;
  writeSyncState(state);
}

function getUnsynced<T extends { id: string }>(userId: string, section: string, rows: T[]): T[] {
  const state = readSyncState();
  const synced = new Set(state[userId]?.[section] || []);
  return rows.filter((r) => !synced.has(r.id));
}

async function apiCall(path: string, token: string, options: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  if (!dataUrl || !dataUrl.includes(',')) return null;
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export async function migrateLocalDataToBackend(userId: string, token: string) {
  const db = getDb();
  const failures: string[] = [];

  const userExpenses = db.expenses.filter((x) => x.userId === userId);
  const userIncome = db.incomeSavings.filter((x) => x.userId === userId);
  const userInsurance = db.insurance.filter((x) => x.userId === userId);
  const userLending = db.lendingRecords.filter((x) => x.userId === userId);
  const userLoans = db.loans.filter((x) => x.userId === userId);
  const userBanks = db.bankAccounts.filter((x) => x.userId === userId);
  const userHealth = db.healthRecords.filter((x) => x.userId === userId);
  const userReminders = db.reminders.filter((x) => x.userId === userId);
  const userMonthly = db.monthlyConfirmations.filter((x) => x.userId === userId);
  const userDocs = db.documents.filter((x) => x.userId === userId);

  try {
    const latestIncome = userIncome[userIncome.length - 1];
    if (latestIncome) {
      const incomeUnsynced = getUnsynced(userId, 'income', userIncome);
      if (incomeUnsynced.length > 0) {
        const response = await apiCall('/income/update', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthly_income: latestIncome.monthlyIncome || 0,
            other_income: latestIncome.otherIncome || 0,
            monthly_expenses: latestIncome.monthlyExpenses || 0,
            current_savings: latestIncome.currentSavings || 0,
            emergency_fund: latestIncome.emergencyFund || 0,
            dependents: latestIncome.dependents || 0,
          }),
        });
        if (response.ok) {
          markSynced(userId, 'income', incomeUnsynced.map((x) => x.id));
        } else {
          failures.push('income');
        }
      }
    }
  } catch {
    failures.push('income');
  }

  try {
    const unsyncedExpenses = getUnsynced(userId, 'expenses', userExpenses);
    if (unsyncedExpenses.length > 0) {
      const groups = new Map<string, { month: number; year: number }>();
      unsyncedExpenses.forEach((e) => groups.set(`${e.month}-${e.year}`, { month: e.month, year: e.year }));

      for (const group of groups.values()) {
        const monthlyRows = userExpenses.filter((e) => e.month === group.month && e.year === group.year);
        const categories: Record<string, number> = {};
        monthlyRows.forEach((e) => {
          categories[e.category] = (categories[e.category] || 0) + e.amount;
        });
        const response = await apiCall('/expense/add', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: group.month, year: group.year, categories }),
        });
        if (response.ok) {
          const ids = monthlyRows.map((x) => x.id);
          markSynced(userId, 'expenses', ids);
        } else {
          failures.push(`expense-${group.month}-${group.year}`);
        }
      }
    }
  } catch {
    failures.push('expenses');
  }

  for (const row of getUnsynced(userId, 'insurance', userInsurance)) {
    try {
      const response = await apiCall('/insurance/add', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: row.provider,
          policy_number: row.policyNumber,
          coverage_amount: row.coverageAmount || 0,
        }),
      });
      if (response.ok) markSynced(userId, 'insurance', [row.id]);
      else failures.push(`insurance-${row.id}`);
    } catch {
      failures.push(`insurance-${row.id}`);
    }
  }

  for (const row of getUnsynced(userId, 'lending', userLending)) {
    try {
      const response = await apiCall('/lending/add', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: row.type === 'lent' ? 'given' : 'taken',
          amount: row.amount || 0,
          person: row.person,
          expected_return_date: row.expectedReturnDate,
        }),
      });
      if (response.ok) markSynced(userId, 'lending', [row.id]);
      else failures.push(`lending-${row.id}`);
    } catch {
      failures.push(`lending-${row.id}`);
    }
  }

  for (const row of getUnsynced(userId, 'loans', userLoans)) {
    try {
      const response = await apiCall('/loans/add', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_type: row.loanType,
          emi: row.monthlyEmi || 0,
          outstanding_amount: row.outstandingAmount || 0,
          interest_rate: row.interestRate || 0,
          remaining_tenure: row.remainingTenure || 0,
          due_date: row.dueDate,
        }),
      });
      if (response.ok) markSynced(userId, 'loans', [row.id]);
      else failures.push(`loan-${row.id}`);
    } catch {
      failures.push(`loan-${row.id}`);
    }
  }

  for (const row of getUnsynced(userId, 'banks', userBanks)) {
    try {
      const response = await apiCall('/bank/add', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: row.bankName,
          ifsc_code: row.ifscCode,
          account_number: row.accountLast4,
        }),
      });
      if (response.ok) markSynced(userId, 'banks', [row.id]);
      else failures.push(`bank-${row.id}`);
    } catch {
      failures.push(`bank-${row.id}`);
    }
  }

  try {
    const unsyncedHealth = getUnsynced(userId, 'health', userHealth);
    const latestHealth = unsyncedHealth[unsyncedHealth.length - 1];
    if (latestHealth) {
      const response = await apiCall('/health/add', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_group: latestHealth.bloodGroup,
          allergies: latestHealth.allergies || '',
          medical_conditions: latestHealth.medicalConditions || '',
        }),
      });
      if (response.ok) markSynced(userId, 'health', unsyncedHealth.map((x) => x.id));
      else failures.push('health');
    }
  } catch {
    failures.push('health');
  }

  for (const row of getUnsynced(userId, 'reminders', userReminders)) {
    const normalizedType = (row.type || '').toLowerCase();
    if (normalizedType !== 'sms' && normalizedType !== 'email') continue;
    try {
      const response = await apiCall('/reminders/create', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: row.message,
          type: normalizedType,
          send_at: new Date(row.sendAt).toISOString(),
        }),
      });
      if (response.ok) markSynced(userId, 'reminders', [row.id]);
      else failures.push(`reminder-${row.id}`);
    } catch {
      failures.push(`reminder-${row.id}`);
    }
  }

  for (const row of getUnsynced(userId, 'monthly', userMonthly)) {
    try {
      const response = await apiCall(`/monthly/confirm?month=${row.month}&year=${row.year}`, token, {
        method: 'POST',
      });
      if (response.ok) markSynced(userId, 'monthly', [row.id]);
      else failures.push(`monthly-${row.id}`);
    } catch {
      failures.push(`monthly-${row.id}`);
    }
  }

  for (const row of getUnsynced(userId, 'documents', userDocs)) {
    const file = dataUrlToFile(row.fileData || '', `${row.name || 'document'}.png`);
    if (!file) continue;
    try {
      const formData = new FormData();
      formData.append('doc_type', row.category);
      formData.append('file', file);

      const response = await apiCall('/documents/upload', token, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) markSynced(userId, 'documents', [row.id]);
      else failures.push(`document-${row.id}`);
    } catch {
      failures.push(`document-${row.id}`);
    }
  }

  return { failures };
}
