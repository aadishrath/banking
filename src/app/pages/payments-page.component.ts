import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './payments-page.component.html',
  styleUrl: './payments-page.component.scss'
})
export class PaymentsPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(BankingStoreService);
  readonly resultMessage = signal('');
  readonly depositAccounts = computed(() => this.store.liquidAccounts());
  readonly card = computed(() => this.store.cardAccounts()[0] ?? null);

  readonly transferForm = this.fb.nonNullable.group({
    fromId: ['acct-checking', Validators.required],
    toId: ['acct-savings', Validators.required],
    amount: [250, [Validators.required, Validators.min(1)]],
    note: ['Scheduled transfer']
  });

  readonly paymentForm = this.fb.nonNullable.group({
    fromId: ['acct-checking', Validators.required],
    amount: [120, [Validators.required, Validators.min(1)]],
    note: ['Monthly card payment']
  });

  async submitTransfer() {
    const form = this.transferForm.getRawValue();
    const result = await this.store.transfer({
      fromId: form.fromId,
      toId: form.toId,
      amount: Number(form.amount),
      note: form.note,
      channel: 'app'
    });
    this.resultMessage.set(result.message);
  }

  async submitPayment() {
    const form = this.paymentForm.getRawValue();
    const card = this.card();
    if (!card) {
      this.resultMessage.set('No card account is available.');
      return;
    }

    const result = await this.store.payCard({
      fromId: form.fromId,
      cardId: card.id,
      amount: Number(form.amount),
      note: form.note,
      channel: 'app'
    });
    this.resultMessage.set(result.message);
  }

  async toggleCardFreeze() {
    const card = this.card();
    if (!card) {
      return;
    }

    const result = await this.store.setCardFrozen(card.id, card.status !== 'frozen', 'app');
    this.resultMessage.set(result.message);
  }
}
