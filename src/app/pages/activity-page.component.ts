import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankingStoreService } from '../core/banking-store.service';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, StatusPillComponent],
  templateUrl: './activity-page.component.html',
  styleUrl: './activity-page.component.scss'
})
export class ActivityPageComponent {
  readonly statusFilter = signal('all');
  readonly channelFilter = signal('all');

  readonly filteredActivity = computed(() =>
    this.store.activity().filter((entry) => {
      const statusMatches = this.statusFilter() === 'all' || entry.status === this.statusFilter();
      const channelMatches =
        this.channelFilter() === 'all' || entry.channel === this.channelFilter();
      return statusMatches && channelMatches;
    })
  );

  constructor(public readonly store: BankingStoreService) {}
}
