import { TestBed } from '@angular/core/testing';
import { BankingStoreService } from './banking-store.service';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let chatbot: ChatbotService;
  let store: BankingStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    chatbot = TestBed.inject(ChatbotService);
    store = TestBed.inject(BankingStoreService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('answers balance questions and logs an insight', () => {
    chatbot.handle('what is my balance?');

    const messages = store.chatMessages();
    expect(messages[messages.length - 1].text).toContain('Liquid balances total');
    expect(store.activity()[0].title).toBe('Chatbot balance request');
  });

  it('executes transfers from chat', () => {
    chatbot.handle('transfer 250 from checking to vacation savings');
    expect(store.chatMessages()[store.chatMessages().length - 1].text).toContain('Transferred $250.00');
    expect(store.activity().some((entry) => entry.title === 'Transfer completed')).toBeTrue();
  });

  it('executes card payments from chat', () => {
    chatbot.handle('pay 125 on the card from checking');
    expect(store.chatMessages()[store.chatMessages().length - 1].text).toContain('Paid $125.00');
    expect(store.activity().some((entry) => entry.title === 'Card payment completed')).toBeTrue();
  });

  it('freezes and unfreezes the card from chat', () => {
    chatbot.handle('freeze my card');
    expect(store.accounts().find((account) => account.id === 'acct-card')?.status).toBe('frozen');

    chatbot.handle('unfreeze my card');
    expect(store.accounts().find((account) => account.id === 'acct-card')?.status).toBe('active');
  });

  it('returns guidance for unsupported or incomplete prompts', () => {
    chatbot.handle('transfer from checking');
    expect(store.chatMessages()[store.chatMessages().length - 1].text).toContain('Please include an amount');

    chatbot.handle('do something unexpected');
    expect(store.chatMessages()[store.chatMessages().length - 1].text).toContain('I can help with transfers');
  });

  it('ignores empty prompts', () => {
    const before = store.chatMessages().length;
    chatbot.handle('   ');
    expect(store.chatMessages().length).toBe(before);
  });

  it('handles card payment prompts with unknown accounts', () => {
    chatbot.handle('pay 125 on the card from offshore vault');
    expect(store.chatMessages()[store.chatMessages().length - 1].text).toContain('could not find that funding account');
  });
});
