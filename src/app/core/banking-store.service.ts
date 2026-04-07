import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  Account,
  ActivityChannel,
  ActivityEntry,
  BankingState,
  ManagedUser,
  PaymentRequest,
  Permission,
  TransferRequest,
  UserProfile,
  UserRole
} from './models';
import { demoUsers, initialState } from './mock-data';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BankingStoreService {
  private readonly api = inject(ApiService);
  private readonly state = signal<BankingState>(structuredClone(initialState));

  readonly session = computed(() => this.state().session);
  readonly profile = computed(() => this.state().profile);
  readonly accounts = computed(() => this.state().accounts);
  readonly activity = computed(() =>
    [...this.state().activity].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  );
  readonly chatMessages = computed(() => this.state().chat);
  readonly companyWorkspace = computed(() => this.state().companyWorkspace ?? null);
  readonly isAuthenticated = computed(() => this.session().isAuthenticated);
  readonly hasValidSession = computed(
    () => this.session().isAuthenticated && !!this.session().sessionId && !!this.api.token
  );
  readonly role = computed<UserRole>(() => this.session().role);
  readonly permissions = computed(() => this.session().permissions);
  readonly liquidAccounts = computed(() => this.accounts().filter((account) => account.kind === 'deposit'));
  readonly cardAccounts = computed(() => this.accounts().filter((account) => account.kind === 'card'));
  readonly totalBalance = computed(() =>
    this.liquidAccounts().reduce((sum, account) => sum + account.balance, 0)
  );
  readonly cardOutstanding = computed(() =>
    Math.abs(this.cardAccounts().reduce((sum, account) => sum + Math.min(account.balance, 0), 0))
  );
  readonly recentActivity = computed(() => this.activity().slice(0, 6));
  readonly upcomingPayment = computed(() => this.cardAccounts()[0] ?? null);
  readonly demoUsers = computed(() => demoUsers);

  constructor() {
    effect(() => {
      this.state();
    });
  }

  async initialize() {
    if (!this.api.token) {
      return;
    }

    try {
      const response = (await this.api.me()) as { data: BankingState };
      this.applySnapshot(response.data);
    } catch {
      this.api.clearToken();
      this.state.set(structuredClone(initialState));
    }
  }

  can(permission: Permission) {
    return this.permissions().includes(permission);
  }

  async login(username: string, password: string) {
    try {
      const response = (await this.api.login(username, password)) as {
        token: string;
        data: BankingState;
      };
      this.api.setToken(response.token);
      this.applySnapshot(response.data);
      return {
        ok: true,
        message: `Welcome back to Luminate Bank, ${response.data.profile.name.split(' ')[0]}.`
      };
    } catch (error: unknown) {
      return {
        ok: false,
        message:
          (error as { error?: { message?: string } })?.error?.message ||
          'Unable to log in with those credentials.'
      };
    }
  }

  async logout() {
    try {
      await this.api.logout();
    } catch {}
    this.api.clearToken();
    this.state.set({
      ...this.state(),
      session: {
        ...this.state().session,
        isAuthenticated: false,
        sessionId: undefined
      }
    });
  }

  pushUserMessage(text: string) {
    this.state.update((state) => ({
      ...state,
      chat: [
        ...state.chat,
        {
          id: `local-user-${Date.now()}`,
          role: 'user',
          text,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }
      ]
    }));
  }

  pushAssistantMessage(text: string) {
    this.state.update((state) => ({
      ...state,
      chat: [
        ...state.chat,
        {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          text,
          timestamp: new Date().toISOString(),
          status: 'processed'
        }
      ]
    }));
  }

  async transfer(request: TransferRequest) {
    try {
      const response = (await this.api.transfer(request)) as {
        ok: boolean;
        message: string;
        data: BankingState;
      };
      this.applySnapshot(response.data);
      return { ok: true, message: response.message };
    } catch (error: unknown) {
      return this.handleApiError(error);
    }
  }

  async payCard(request: PaymentRequest) {
    try {
      const response = (await this.api.payCard(request)) as {
        ok: boolean;
        message: string;
        data: BankingState;
      };
      this.applySnapshot(response.data);
      return { ok: true, message: response.message };
    } catch (error: unknown) {
      return this.handleApiError(error);
    }
  }

  async setCardFrozen(cardId: string, freeze: boolean, _channel: ActivityChannel) {
    try {
      const response = (await this.api.setCardFrozen({ cardId, freeze })) as {
        ok: boolean;
        message: string;
        data: BankingState;
      };
      this.applySnapshot(response.data);
      return { ok: true, message: response.message };
    } catch (error: unknown) {
      return this.handleApiError(error);
    }
  }

  logInsight(_title: string, _description: string, _channel: ActivityChannel = 'system') {}

  findAccountByText(input: string, kind?: Account['kind']) {
    const normalized = input.trim().toLowerCase();
    return this.accounts().find((account) => {
      if (kind && account.kind !== kind) {
        return false;
      }

      const candidates = [account.name.toLowerCase(), account.subtype.toLowerCase(), ...account.alias];
      return candidates.some((candidate) => normalized.includes(candidate.toLowerCase()));
    });
  }

  formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  describeRole(role: UserRole) {
    if (role === 'admin') {
      return 'administrator';
    }
    if (role === 'company') {
      return 'company treasury';
    }
    return 'customer';
  }

  applyChatUpdate(chat: BankingState['chat'], activity: BankingState['activity']) {
    this.state.update((state) => ({
      ...state,
      chat,
      activity
    }));
  }

  async updateProfile(payload: Partial<UserProfile> & { password?: string }) {
    try {
      const profile = (await this.api.patchProfile(payload)) as UserProfile;
      this.state.update((state) => ({
        ...state,
        profile
      }));
      return { ok: true, message: 'Profile details were saved.' };
    } catch (error: unknown) {
      return this.handleApiError(error);
    }
  }

  async updatePermissions(permissions: Permission[]) {
    try {
      const response = (await this.api.patchPermissions({ permissions })) as {
        data: BankingState;
      };
      this.applySnapshot(response.data);
      return { ok: true, message: 'Role permissions were updated.' };
    } catch (error: unknown) {
      return this.handleApiError(error);
    }
  }

  async listUsers() {
    return (await this.api.listUsers()) as { users: ManagedUser[]; allowedRoles: UserRole[] };
  }

  async createUser(payload: {
    username: string;
    password: string;
    role: UserRole;
    name: string;
    email: string;
    permissions: Permission[];
    organization?: string;
  }) {
    return (await this.api.createUser(payload)) as { user: ManagedUser };
  }

  async updateUser(
    id: string,
    payload: {
      password?: string;
      role: UserRole;
      name: string;
      email: string;
      permissions: Permission[];
      organization?: string;
    }
  ) {
    return (await this.api.updateUser(id, payload)) as { user: ManagedUser };
  }

  async deleteUser(id: string) {
    return (await this.api.deleteUser(id)) as { ok: boolean };
  }

  private applySnapshot(snapshot: BankingState) {
    this.state.set({
      ...snapshot,
      session: {
        ...snapshot.session,
        isAuthenticated: true
      }
    });
  }

  private handleApiError(error: unknown) {
    return {
      ok: false,
      message:
        (error as { error?: { message?: string } })?.error?.message ||
        'The request could not be completed right now.'
    };
  }
}
