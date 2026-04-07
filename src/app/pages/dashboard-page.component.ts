import { Component, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BankingStoreService } from '../core/banking-store.service';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, StatusPillComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  readonly monthlyMovement = computed(() =>
    this.store
      .liquidAccounts()
      .flatMap((account) => account.transactions)
      .slice(0, 5)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );

  constructor(public readonly store: BankingStoreService) {}
}
