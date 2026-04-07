import { TestBed } from '@angular/core/testing';
import { BankingStoreService } from './banking-store.service';

describe('BankingStoreService', () => {
  let service: BankingStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BankingStoreService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('logs failed and successful login attempts', () => {
    const failed = service.login('wrong', 'creds');
    expect(failed.ok).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.activity().some((entry) => entry.title === 'Login failed')).toBeTrue();

    const successful = service.login('demo', 'banking2026');
    expect(successful.ok).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.session().lastLoginAt).toBeTruthy();
    expect(service.activity().some((entry) => entry.title === 'Login successful')).toBeTrue();
  });

  it('transfers funds between deposit accounts and writes activity entries', () => {
    const checkingBefore = service.accounts().find((account) => account.id === 'acct-checking')!;
    const savingsBefore = service.accounts().find((account) => account.id === 'acct-savings')!;

    const result = service.transfer({
      fromId: 'acct-checking',
      toId: 'acct-savings',
      amount: 100,
      note: 'Test transfer',
      channel: 'app'
    });

    expect(result.ok).toBeTrue();
    const checkingAfter = service.accounts().find((account) => account.id === 'acct-checking')!;
    const savingsAfter = service.accounts().find((account) => account.id === 'acct-savings')!;
    expect(checkingAfter.balance).toBeCloseTo(checkingBefore.balance - 100, 2);
    expect(savingsAfter.balance).toBeCloseTo(savingsBefore.balance + 100, 2);
    expect(service.activity().some((entry) => entry.title === 'Transfer requested')).toBeTrue();
    expect(service.activity().some((entry) => entry.title === 'Transfer completed')).toBeTrue();
  });

  it('rejects invalid transfers', () => {
    const result = service.transfer({
      fromId: 'acct-checking',
      toId: 'acct-checking',
      amount: 100,
      note: 'Invalid transfer',
      channel: 'app'
    });

    expect(result.ok).toBeFalse();
    expect(result.message).toContain('different accounts');
    expect(service.activity().some((entry) => entry.title === 'Transfer failed')).toBeTrue();
  });

  it('pays the credit card and updates both accounts', () => {
    const fundingBefore = service.accounts().find((account) => account.id === 'acct-checking')!;
    const cardBefore = service.accounts().find((account) => account.id === 'acct-card')!;

    const result = service.payCard({
      fromId: 'acct-checking',
      cardId: 'acct-card',
      amount: 200,
      note: 'Card payment',
      channel: 'app'
    });

    expect(result.ok).toBeTrue();
    const fundingAfter = service.accounts().find((account) => account.id === 'acct-checking')!;
    const cardAfter = service.accounts().find((account) => account.id === 'acct-card')!;
    expect(fundingAfter.balance).toBeCloseTo(fundingBefore.balance - 200, 2);
    expect(cardAfter.balance).toBeCloseTo(cardBefore.balance + 200, 2);
  });

  it('freezes and unfreezes the card', () => {
    const frozen = service.setCardFrozen('acct-card', true, 'app');
    expect(frozen.ok).toBeTrue();
    expect(service.accounts().find((account) => account.id === 'acct-card')?.status).toBe('frozen');

    const thawed = service.setCardFrozen('acct-card', false, 'app');
    expect(thawed.ok).toBeTrue();
    expect(service.accounts().find((account) => account.id === 'acct-card')?.status).toBe('active');
  });

  it('adds chat messages and insights', () => {
    service.pushUserMessage('hello');
    service.pushAssistantMessage('hi');
    service.logInsight('Insight', 'Body', 'chatbot');

    const messages = service.chatMessages();
    expect(messages[messages.length - 2].role).toBe('user');
    expect(messages[messages.length - 1].role).toBe('assistant');
    expect(service.activity()[0].title).toBe('Insight');
  });

  it('finds accounts by fuzzy aliases and formats currency', () => {
    expect(service.findAccountByText('move money from checking', 'deposit')?.id).toBe('acct-checking');
    expect(service.findAccountByText('freeze my rewards card', 'card')?.id).toBe('acct-card');
    expect(service.formatCurrency(42)).toBe('$42.00');
  });

  it('logs out and clears the authenticated session', () => {
    service.login('demo', 'banking2026');
    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.activity().some((entry) => entry.title === 'Logout successful')).toBeTrue();
  });

  it('rejects payments without enough funds', () => {
    const result = service.payCard({
      fromId: 'acct-checking',
      cardId: 'acct-card',
      amount: 999999,
      note: 'Too much',
      channel: 'app'
    });

    expect(result.ok).toBeFalse();
    expect(result.message).toContain('Not enough available funds');
  });

  it('prevents duplicate freeze actions', () => {
    service.setCardFrozen('acct-card', true, 'app');
    const result = service.setCardFrozen('acct-card', true, 'app');

    expect(result.ok).toBeFalse();
    expect(result.message).toContain('already frozen');
  });
});
