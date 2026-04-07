import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentsPageComponent } from './payments-page.component';
import { BankingStoreService } from '../core/banking-store.service';

describe('PaymentsPageComponent', () => {
  let fixture: ComponentFixture<PaymentsPageComponent>;
  let component: PaymentsPageComponent;
  let store: BankingStoreService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PaymentsPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsPageComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(BankingStoreService);
    fixture.detectChanges();
  });

  it('submits a transfer and surfaces the result', () => {
    component.transferForm.setValue({
      fromId: 'acct-checking',
      toId: 'acct-savings',
      amount: 75,
      note: 'Spec transfer'
    });

    component.submitTransfer();

    expect(component.resultMessage()).toContain('Transferred $75.00');
    expect(store.activity().some((entry) => entry.title === 'Transfer completed')).toBeTrue();
  });

  it('submits a card payment and updates the result message', () => {
    component.paymentForm.setValue({
      fromId: 'acct-checking',
      amount: 50,
      note: 'Spec payment'
    });

    component.submitPayment();

    expect(component.resultMessage()).toContain('Paid $50.00');
    expect(store.activity().some((entry) => entry.title === 'Card payment completed')).toBeTrue();
  });

  it('toggles the card freeze state', () => {
    component.toggleCardFreeze();
    expect(store.accounts().find((account) => account.id === 'acct-card')?.status).toBe('frozen');
    expect(component.resultMessage()).toContain('now frozen');
  });
});
