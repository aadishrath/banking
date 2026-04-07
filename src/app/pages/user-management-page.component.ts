import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingStoreService } from '../core/banking-store.service';
import { ManagedUser, Permission, UserRole } from '../core/models';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss'
})
export class UserManagementPageComponent {
  private readonly formBuilder = inject(FormBuilder);

  constructor(public readonly store: BankingStoreService) {
    this.loadUsers();
    this.syncDefaultPermissions(this.form.controls.role.value);
  }

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.minLength(6)]],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['customer' as UserRole, [Validators.required]],
    organization: ['']
  });

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly editingUserId = signal<string | null>(null);
  readonly users = signal<ManagedUser[]>([]);
  readonly allowedRoles = signal<UserRole[]>([]);
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly selectedPermissions = signal<Permission[]>([]);

  readonly isEditing = computed(() => !!this.editingUserId());
  readonly currentUser = computed(
    () => this.users().find((user) => user.id === this.editingUserId()) ?? null
  );

  readonly permissionLabels: Record<Permission, string> = {
    view_payments: 'View payments',
    make_transfer: 'Make transfer',
    pay_card: 'Pay card',
    freeze_card: 'Freeze card',
    chat_balance: 'Chat balance',
    chat_execute: 'Chat actions',
    edit_profile: 'Edit profile',
    manage_permissions: 'Manage permissions',
    manage_users: 'Manage users',
    view_company_hub: 'Company hub',
    view_activity: 'View activity'
  };

  readonly allPermissions: Permission[] = [
    'view_payments',
    'make_transfer',
    'pay_card',
    'freeze_card',
    'chat_balance',
    'chat_execute',
    'edit_profile',
    'manage_permissions',
    'manage_users',
    'view_company_hub',
    'view_activity'
  ];

  readonly assignablePermissions = computed(() =>
    this.store.role() === 'admin'
      ? this.allPermissions
      : this.allPermissions.filter(
          (permission) => !['manage_permissions', 'manage_users'].includes(permission)
        )
  );

  permissionText(permission: Permission) {
    return this.permissionLabels[permission] || permission;
  }

  onRoleChange(role: string) {
    if (this.isEditing() && this.currentUser()) {
      return;
    }

    this.syncDefaultPermissions(role as UserRole);
  }

  togglePermission(permission: Permission) {
    if (this.selectedPermissions().includes(permission)) {
      if (this.selectedPermissions().length <= 1) {
        this.feedback.set({
          type: 'error',
          text: 'Each user needs at least one assigned permission.'
        });
        return;
      }

      this.selectedPermissions.update((current) => current.filter((item) => item !== permission));
      return;
    }

    this.selectedPermissions.update((current) => [...current, permission]);
    this.feedback.set(null);
  }

  startCreate() {
    this.editingUserId.set(null);
    this.form.reset({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'customer',
      organization: ''
    });
    this.form.controls.username.enable({ emitEvent: false });
    this.syncDefaultPermissions('customer');
    this.feedback.set(null);
  }

  beginEdit(user: ManagedUser) {
    this.editingUserId.set(user.id);
    this.form.reset({
      username: user.username,
      password: '',
      name: user.profile.name,
      email: user.profile.email,
      role: user.role,
      organization: user.profile.organization || ''
    });
    this.form.controls.username.disable({ emitEvent: false });
    this.selectedPermissions.set([...user.permissions]);
    this.feedback.set(null);
  }

  async submitUser() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.selectedPermissions().length < 1) {
      this.feedback.set({
        type: 'error',
        text: 'Each user needs at least one assigned permission.'
      });
      return;
    }

    this.saving.set(true);
    this.feedback.set(null);

    try {
      const raw = this.form.getRawValue();

      if (this.isEditing() && this.editingUserId()) {
        await this.store.updateUser(this.editingUserId()!, {
          password: raw.password.trim() || undefined,
          role: raw.role,
          name: raw.name.trim(),
          email: raw.email.trim(),
          permissions: this.selectedPermissions(),
          organization: raw.organization.trim() || undefined
        });

        this.feedback.set({
          type: 'success',
          text: `${raw.username} was updated successfully.`
        });
        const successMessage = this.feedback();
        this.startCreate();
        this.feedback.set(successMessage);
      } else {
        if (!raw.password.trim()) {
          this.feedback.set({
            type: 'error',
            text: 'A password is required when creating a user.'
          });
          this.saving.set(false);
          return;
        }

        await this.store.createUser({
          username: raw.username.trim(),
          password: raw.password.trim(),
          role: raw.role,
          name: raw.name.trim(),
          email: raw.email.trim(),
          permissions: this.selectedPermissions(),
          organization: raw.organization.trim() || undefined
        });

        this.feedback.set({
          type: 'success',
          text: `${raw.username.trim()} was added successfully.`
        });
        const successMessage = this.feedback();
        this.startCreate();
        this.feedback.set(successMessage);
      }

      await this.loadUsers();
    } catch (error: unknown) {
      this.feedback.set({
        type: 'error',
        text:
          (error as { error?: { message?: string } })?.error?.message ||
          `The user could not be ${this.isEditing() ? 'updated' : 'created'} right now.`
      });
    } finally {
      this.saving.set(false);
    }
  }

  async removeUser(user: ManagedUser) {
    this.removingId.set(user.id);
    this.feedback.set(null);

    try {
      await this.store.deleteUser(user.id);
      this.feedback.set({
        type: 'success',
        text: `${user.username} was removed.`
      });

      if (this.editingUserId() === user.id) {
        this.startCreate();
      }

      await this.loadUsers();
    } catch (error: unknown) {
      this.feedback.set({
        type: 'error',
        text:
          (error as { error?: { message?: string } })?.error?.message ||
          'The user could not be removed right now.'
      });
    } finally {
      this.removingId.set(null);
    }
  }

  private async loadUsers() {
    this.loading.set(true);

    try {
      const response = await this.store.listUsers();
      this.users.set(response.users);
      this.allowedRoles.set(response.allowedRoles);
    } finally {
      this.loading.set(false);
    }
  }

  private syncDefaultPermissions(role: UserRole) {
    const defaults: Record<UserRole, Permission[]> = {
      admin: [
        'view_payments',
        'make_transfer',
        'pay_card',
        'freeze_card',
        'chat_balance',
        'chat_execute',
        'edit_profile',
        'manage_permissions',
        'manage_users',
        'view_company_hub',
        'view_activity'
      ],
      company: [
        'view_payments',
        'make_transfer',
        'chat_balance',
        'chat_execute',
        'edit_profile',
        'view_company_hub',
        'view_activity'
      ],
      customer: ['view_payments', 'make_transfer', 'pay_card', 'chat_balance', 'view_activity']
    };

    const allowed = this.assignablePermissions();
    const next = defaults[role].filter((permission) => allowed.includes(permission));
    this.selectedPermissions.set(next.length ? next : [allowed[0]]);
    this.feedback.set(null);
  }
}
