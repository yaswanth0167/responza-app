// localStorage-based JSON database

const DB_KEY = 'responza_db';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  address: string;
  email: string;
  mobile: string;
  fatherName: string;
  username: string;
  password: string;
  favouriteColour: string;
  favouritePlace: string;
  preferredLanguage: string;
  nominee?: Nominee;
}

export interface Nominee {
  name: string;
  relationship: string;
  contactNumber: string;
  altContact: string;
  email: string;
}

export interface Document {
  id: string;
  userId: string;
  category: string;
  name: string;
  number: string;
  fileData?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  ifscCode: string;
  accountLast4: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  loanType: string;
  monthlyEmi: number;
  outstandingAmount: number;
  interestRate: number;
  remainingTenure: number;
  dueDate: string;
  createdAt: string;
}

export interface Insurance {
  id: string;
  userId: string;
  type: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premiumAmount: number;
  premiumDue: string;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  memberName: string;
  age: number;
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  medicalRecords: string;
}

export interface IncomeSavings {
  id: string;
  userId: string;
  monthlyIncome: number;
  otherIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  emergencyFund: number;
  dependents: number;
}

export interface Expense {
  id: string;
  userId: string;
  month: number;
  year: number;
  category: string;
  amount: number;
  createdAt: string;
}

export interface EmergencyRecord {
  id: string;
  userId: string;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  message: string;
  type: string;
  sendAt: string;
  createdAt: string;
}

export interface LendingRecord {
  id: string;
  userId: string;
  type: 'lent' | 'borrowed';
  amount: number;
  person: string;
  expectedReturnDate: string;
  createdAt: string;
}

export interface MonthlyConfirmation {
  id: string;
  userId: string;
  month: number;
  year: number;
  financialDataConfirmed: boolean;
  createdAt: string;
}

export interface Database {
  users: User[];
  documents: Document[];
  bankAccounts: BankAccount[];
  loans: Loan[];
  insurance: Insurance[];
  healthRecords: HealthRecord[];
  incomeSavings: IncomeSavings[];
  expenses: Expense[];
  emergencyRecords: EmergencyRecord[];
  reminders: Reminder[];
  lendingRecords: LendingRecord[];
  monthlyConfirmations: MonthlyConfirmation[];
}

const demoUser: User = {
  id: 'demo-001',
  firstName: 'Demo',
  lastName: 'User',
  dob: '1995-01-01',
  gender: 'male',
  address: 'Hyderabad, Telangana',
  email: 'demo@responza.com',
  mobile: '9999999999',
  fatherName: 'Ramesh',
  username: 'demo',
  password: 'Demo@123',
  favouriteColour: 'blue',
  favouritePlace: 'Hyderabad',
};

const defaultDb: Database = {
  users: [demoUser],
  documents: [],
  bankAccounts: [],
  loans: [],
  insurance: [],
  healthRecords: [],
  incomeSavings: [],
  expenses: [],
  emergencyRecords: [],
  reminders: [],
  lendingRecords: [],
  monthlyConfirmations: [],
};

export function getDb(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      setDb(defaultDb);
      return defaultDb;
    }
    const db = JSON.parse(raw) as Database;
    if (!db.users.find(u => u.username === 'demo')) {
      db.users.push(demoUser);
      setDb(db);
    }
    return db;
  } catch {
    setDb(defaultDb);
    return defaultDb;
  }
}

export function setDb(db: Database) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function updateDb(updater: (db: Database) => Database) {
  const db = getDb();
  const updated = updater(db);
  setDb(updated);
  return updated;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
