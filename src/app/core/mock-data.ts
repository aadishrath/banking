import { Account, ActivityEntry, BankingState, ChatMessage, CompanyWorkspace, DemoUser, Permission } from './models';

const now = new Date();
const daysAgo = (days: number, hour = 9) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

const retailPermissions: Permission[] = [
  'view_payments',
  'make_transfer',
  'pay_card',
  'freeze_card',
  'chat_balance',
  'chat_execute',
  'edit_profile',
  'manage_permissions',
  'manage_users',
  'view_company_hub',
  'view_activity'
];

export const demoUsers: DemoUser[] = [
  {
    username: 'admin',
    password: 'admin2026',
    role: 'admin',
    permissions: retailPermissions,
    profile: {
      id: 'usr-admin',
      username: 'admin',
      name: 'Jordan Ellis',
      email: 'jordan.ellis@aadishbank.demo',
      phoneNumber: '(212) 555-0189',
      address: '350 Hudson Street, New York, NY 10014',
      twoFactorEnabled: true,
      membership: 'Platform Administrator',
      location: 'New York, NY',
      initials: 'JE'
    }
  },
  {
    username: 'customer',
    password: 'customer2026',
    role: 'customer',
    permissions: ['view_payments', 'make_transfer', 'pay_card', 'chat_balance', 'view_activity'],
    profile: {
      id: 'usr-customer',
      username: 'customer',
      name: 'Ava Morgan',
      email: 'ava.morgan@aadishbank.demo',
      phoneNumber: '(415) 555-0147',
      address: '1280 Market Street, San Francisco, CA 94102',
      twoFactorEnabled: false,
      membership: 'Private Client',
      location: 'San Francisco, CA',
      initials: 'AM'
    }
  },
  {
    username: 'company',
    password: 'company2026',
    role: 'company',
    permissions: ['view_payments', 'make_transfer', 'chat_balance', 'chat_execute', 'edit_profile', 'manage_users', 'view_company_hub', 'view_activity'],
    profile: {
      id: 'usr-company',
      username: 'company',
      name: 'Maya Chen',
      email: 'maya.chen@northstar-industries.demo',
      phoneNumber: '(206) 555-0122',
      address: '800 Terry Avenue, Seattle, WA 98109',
      twoFactorEnabled: true,
      membership: 'Business Treasury',
      location: 'Seattle, WA',
      initials: 'MC',
      organization: 'Northstar Industries'
    }
  }
];

const buildRetailAccounts = (): Account[] => [
  {
    id: 'acct-checking',
    name: 'Everyday Checking',
    alias: ['checking', 'everyday', 'main checking'],
    kind: 'deposit',
    subtype: 'Checking',
    currency: 'USD',
    balance: 8450.44,
    available: 8450.44,
    accent: 'linear-gradient(135deg, #1d4ed8, #0f766e)',
    status: 'active',
    lastFour: '4821',
    transactions: [
      { id: 'txn-1', timestamp: daysAgo(1, 15), title: 'Payroll deposit', amount: 3200, type: 'credit', detail: 'Aadish Studio' },
      { id: 'txn-2', timestamp: daysAgo(2, 11), title: 'Coffee collective', amount: 18.45, type: 'debit', detail: 'Mission District' },
      { id: 'txn-3', timestamp: daysAgo(4, 14), title: 'Rent transfer', amount: 2100, type: 'debit', detail: 'Autopay' }
    ]
  },
  {
    id: 'acct-savings',
    name: 'Vacation Savings',
    alias: ['savings', 'vacation', 'travel savings'],
    kind: 'deposit',
    subtype: 'High Yield Savings',
    currency: 'USD',
    balance: 15280.91,
    available: 15280.91,
    accent: 'linear-gradient(135deg, #f97316, #ef4444)',
    status: 'active',
    lastFour: '9017',
    transactions: [
      { id: 'txn-4', timestamp: daysAgo(6, 10), title: 'Monthly savings rule', amount: 500, type: 'credit', detail: 'Automatic transfer' },
      { id: 'txn-5', timestamp: daysAgo(10, 16), title: 'Interest payout', amount: 24.11, type: 'credit', detail: 'High yield interest' }
    ]
  },
  {
    id: 'acct-reserve',
    name: 'Emergency Reserve',
    alias: ['reserve', 'emergency', 'backup'],
    kind: 'deposit',
    subtype: 'Money Market',
    currency: 'USD',
    balance: 24110.37,
    available: 24110.37,
    accent: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    status: 'active',
    lastFour: '1142',
    transactions: [{ id: 'txn-6', timestamp: daysAgo(8, 9), title: 'Emergency fund contribution', amount: 750, type: 'credit', detail: 'Standing transfer' }]
  },
  {
    id: 'acct-card',
    name: 'Platinum Rewards Card',
    alias: ['card', 'credit card', 'platinum', 'rewards card'],
    kind: 'card',
    subtype: 'Credit Card',
    currency: 'USD',
    balance: -2340.19,
    available: 15659.81,
    accent: 'linear-gradient(135deg, #111827, #334155)',
    status: 'active',
    lastFour: '7742',
    apr: 19.99,
    dueDate: daysAgo(-9, 17),
    transactions: [
      { id: 'txn-7', timestamp: daysAgo(1, 19), title: 'Airline purchase', amount: 420.32, type: 'debit', detail: 'Booked through travel portal' },
      { id: 'txn-8', timestamp: daysAgo(3, 12), title: 'Dining rewards', amount: 88.5, type: 'debit', detail: 'Restaurant week' }
    ]
  }
];

const buildCompanyAccounts = (): Account[] => [
  {
    id: 'acct-ops',
    name: 'Operating Account',
    alias: ['operating', 'ops', 'business checking'],
    kind: 'deposit',
    subtype: 'Business Checking',
    currency: 'USD',
    balance: 184500.22,
    available: 184500.22,
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    status: 'active',
    lastFour: '3304',
    transactions: [
      { id: 'ctxn-1', timestamp: daysAgo(1, 9), title: 'Client wire received', amount: 48250, type: 'credit', detail: 'Enterprise contract payout' },
      { id: 'ctxn-2', timestamp: daysAgo(2, 14), title: 'Vendor settlement', amount: 12300, type: 'debit', detail: 'Manufacturing partner' }
    ]
  },
  {
    id: 'acct-treasury',
    name: 'Treasury Reserve',
    alias: ['treasury', 'reserve', 'cash reserve'],
    kind: 'deposit',
    subtype: 'Treasury Reserve',
    currency: 'USD',
    balance: 620000,
    available: 620000,
    accent: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
    status: 'active',
    lastFour: '7814',
    transactions: [
      { id: 'ctxn-3', timestamp: daysAgo(5, 11), title: 'Reserve allocation', amount: 65000, type: 'credit', detail: 'Quarterly treasury move' }
    ]
  },
  {
    id: 'acct-payroll',
    name: 'Payroll Wallet',
    alias: ['payroll', 'salary', 'payroll wallet'],
    kind: 'deposit',
    subtype: 'Payroll Account',
    currency: 'USD',
    balance: 94500,
    available: 94500,
    accent: 'linear-gradient(135deg, #f97316, #fb7185)',
    status: 'attention',
    lastFour: '9820',
    transactions: [
      { id: 'ctxn-4', timestamp: daysAgo(3, 8), title: 'Payroll run draft', amount: 68420, type: 'debit', detail: 'Queued for Friday release' }
    ]
  }
];

const buildRetailActivity = (): ActivityEntry[] => [
  {
    id: 'act-1',
    timestamp: daysAgo(0, 8),
    title: 'Session ready',
    description: 'Mock banking environment loaded for today.',
    status: 'info',
    category: 'insight',
    channel: 'system'
  },
  {
    id: 'act-2',
    timestamp: daysAgo(1, 17),
    title: 'Card payment completed',
    description: 'Paid $350.00 from Everyday Checking to Platinum Rewards Card.',
    status: 'success',
    category: 'payment',
    channel: 'app',
    amount: 350
  },
  {
    id: 'act-3',
    timestamp: daysAgo(2, 13),
    title: 'Savings transfer completed',
    description: 'Moved $500.00 from Everyday Checking to Vacation Savings.',
    status: 'success',
    category: 'transfer',
    channel: 'app',
    amount: 500
  }
];

const buildCompanyActivity = (): ActivityEntry[] => [
  {
    id: 'cact-1',
    timestamp: daysAgo(0, 8),
    title: 'Treasury workspace ready',
    description: 'Company treasury dashboard loaded for Northstar Industries.',
    status: 'info',
    category: 'company',
    channel: 'system'
  },
  {
    id: 'cact-2',
    timestamp: daysAgo(1, 10),
    title: 'Invoice approval completed',
    description: 'Approved $18,200 supplier invoice batch for April.',
    status: 'success',
    category: 'company',
    channel: 'app',
    amount: 18200
  },
  {
    id: 'cact-3',
    timestamp: daysAgo(2, 9),
    title: 'Payroll transfer completed',
    description: 'Moved $68,420 into the payroll wallet for Friday release.',
    status: 'success',
    category: 'transfer',
    channel: 'app',
    amount: 68420
  }
];

const buildRetailChat = (name: string, canExecute: boolean): ChatMessage[] => [
  {
    id: 'msg-1',
    role: 'assistant',
    text: canExecute
      ? `Hi ${name.split(' ')[0]}. I can transfer money, pay your card, freeze or unfreeze the card, and answer balance questions.`
      : `Hi ${name.split(' ')[0]}. I can answer balance questions and explain which banking actions are available to your role.`,
    timestamp: now.toISOString(),
    status: 'processed'
  }
];

const buildCompanyChat = (name: string): ChatMessage[] => [
  {
    id: 'msg-company-1',
    role: 'assistant',
    text: `Hi ${name.split(' ')[0]}. I can help with treasury transfers, operating balances, payroll funding, and company workspace questions.`,
    timestamp: now.toISOString(),
    status: 'processed'
  }
];

const buildCompanyWorkspace = (): CompanyWorkspace => ({
  companyName: 'Northstar Industries',
  pendingInvoices: 12,
  pendingApprovals: 4,
  payrollTotal: 68420,
  payrollRunDate: daysAgo(-4, 8),
  treasuryBalance: 620000
});

export const createStateForUser = (user: DemoUser): BankingState => {
  const isCompany = user.role === 'company';
  return {
    session: {
      isAuthenticated: false,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    },
    profile: structuredClone(user.profile),
    accounts: isCompany ? buildCompanyAccounts() : buildRetailAccounts(),
    activity: isCompany ? buildCompanyActivity() : buildRetailActivity(),
    chat: isCompany
      ? buildCompanyChat(user.profile.name)
      : buildRetailChat(user.profile.name, user.permissions.includes('chat_execute')),
    companyWorkspace: isCompany || user.role === 'admin' ? buildCompanyWorkspace() : undefined
  };
};

export const initialState: BankingState = createStateForUser(demoUsers[1]);
