import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.scss'
})
export class AccountsPageComponent {
  readonly activeId = signal('acct-checking');
  readonly activeAccount = computed(
    () => this.store.accounts().find((account) => account.id === this.activeId()) ?? null
  );

  constructor(public readonly store: BankingStoreService) {}
}
