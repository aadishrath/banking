import { Component, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  selector: 'app-company-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './company-page.component.html',
  styleUrl: './company-page.component.scss'
})
export class CompanyPageComponent {
  readonly store = inject(BankingStoreService);
  readonly workspace = computed(() => this.store.companyWorkspace());
}
