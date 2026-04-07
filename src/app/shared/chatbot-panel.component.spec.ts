import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatbotPanelComponent } from './chatbot-panel.component';
import { BankingStoreService } from '../core/banking-store.service';

describe('ChatbotPanelComponent', () => {
  let fixture: ComponentFixture<ChatbotPanelComponent>;
  let component: ChatbotPanelComponent;
  let store: BankingStoreService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ChatbotPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotPanelComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(BankingStoreService);
    fixture.detectChanges();
  });

  it('toggles open state', () => {
    expect(component.isOpen).toBeFalse();
    component.toggle();
    expect(component.isOpen).toBeTrue();
  });

  it('submits a prompt through the chatbot', () => {
    component.form.setValue({ prompt: 'what is my balance?' });
    component.submit();

    const messages = store.chatMessages();
    expect(messages[messages.length - 2].role).toBe('user');
    expect(messages[messages.length - 1].role).toBe('assistant');
  });
});
