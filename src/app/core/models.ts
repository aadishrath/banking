export type AccountKind = 'deposit' | 'card';
export type TaskStatus = 'success' | 'failed' | 'in-progress' | 'info';
export type ActivityChannel = 'app' | 'chatbot' | 'system';
export type UserRole = 'admin' | 'customer' | 'company';
export type Permission =
  | 'view_payments'
  | 'make_transfer'
  | 'pay_card'
  | 'freeze_card'
  | 'chat_balance'
  | 'chat_execute'
  | 'edit_profile'
  | 'manage_permissions'
  | 'manage_users'
  | 'view_company_hub'
  | 'view_activity';
export type ActivityCategory =
  | 'authentication'
  | 'transfer'
  | 'payment'
  | 'security'
  | 'chatbot'
  | 'account'
  | 'insight'
  | 'company';

export interface TransactionRecord {
  id: string;
  timestamp: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
  detail: string;
}

export interface Account {
  id: string;
  name: string;
  alias: string[];
  kind: AccountKind;
  subtype: string;
  currency: string;
  balance: number;
  available: number;
  accent: string;
  status: 'active' | 'attention' | 'frozen';
  lastFour: string;
  apr?: number;
  dueDate?: string;
  transactions: TransactionRecord[];
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: ActivityCategory;
  channel: ActivityChannel;
  amount?: number;
  metadata?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
  status: 'sent' | 'processed';
}

export interface UserProfile {
  id: string;
  username?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  twoFactorEnabled?: boolean;
  membership: string;
  location: string;
  initials: string;
  organization?: string;
}

export interface CompanyWorkspace {
  companyName: string;
  pendingInvoices: number;
  pendingApprovals: number;
  payrollTotal: number;
  payrollRunDate: string;
  treasuryBalance: number;
}

export interface SessionState {
  isAuthenticated: boolean;
  sessionId?: string;
  lastLoginAt?: string;
  username?: string;
  role: UserRole;
  permissions: Permission[];
}

export interface BankingState {
  session: SessionState;
  profile: UserProfile;
  accounts: Account[];
  activity: ActivityEntry[];
  chat: ChatMessage[];
  companyWorkspace?: CompanyWorkspace;
}

export interface DemoUser {
  username: string;
  password: string;
  role: UserRole;
  permissions: Permission[];
  profile: UserProfile;
}

export interface ManagedUser {
  id: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  profile: UserProfile;
}

export interface TransferRequest {
  fromId: string;
  toId: string;
  amount: number;
  note: string;
  channel: ActivityChannel;
}

export interface PaymentRequest {
  fromId: string;
  cardId: string;
  amount: number;
  note: string;
  channel: ActivityChannel;
}
