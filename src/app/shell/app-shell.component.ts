import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BankingStoreService } from '../core/banking-store.service';
import { Permission } from '../core/models';
import { ChatbotPanelComponent } from '../shared/chatbot-panel.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatbotPanelComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly navigationItems: Array<{
    label: string;
    path: string;
    permission?: Permission;
  }> = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Accounts', path: '/accounts' },
    { label: 'Payments', path: '/payments', permission: 'view_payments' },
    { label: 'Activity Log', path: '/activity', permission: 'view_activity' },
    { label: 'Company Hub', path: '/company', permission: 'view_company_hub' },
    { label: 'Users', path: '/users', permission: 'manage_users' },
    { label: 'Profile', path: '/profile' }
  ];

  readonly navigation = computed(() =>
    this.navigationItems.filter((item) => !item.permission || this.store.can(item.permission))
  );
  readonly firstName = computed(() => this.store.profile().name.split(' ')[0]);
  readonly roleLabel = computed(() => this.store.describeRole(this.store.role()));

  constructor(public readonly store: BankingStoreService) {}

  async logout() {
    await this.store.logout();
    this.router.navigateByUrl('/login');
  }
}
