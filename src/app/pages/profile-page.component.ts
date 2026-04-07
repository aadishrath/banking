import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingStoreService } from '../core/banking-store.service';
import { Permission } from '../core/models';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent {
  private readonly formBuilder = inject(FormBuilder);

  constructor(public readonly store: BankingStoreService) {
    effect(() => {
      const profile = this.store.profile();
      const canEdit = this.canEditProfile();

      this.form.patchValue(
        {
          username: profile.username || this.store.session().username || '',
          name: profile.name || '',
          address: profile.address || '',
          phoneNumber: profile.phoneNumber || '',
          email: profile.email || '',
          twoFactorEnabled: !!profile.twoFactorEnabled,
          password: ''
        },
        { emitEvent: false }
      );

      if (canEdit) {
        this.form.enable({ emitEvent: false });
        this.form.controls.username.disable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });

    effect(() => {
      this.assignedPermissions.set([...this.store.permissions()]);
    });
  }

  readonly form = this.formBuilder.nonNullable.group({
    username: [{ value: '', disabled: true }, [Validators.required]],
    name: ['', [Validators.required]],
    address: [''],
    phoneNumber: [''],
    email: ['', [Validators.required, Validators.email]],
    twoFactorEnabled: [false],
    password: ['']
  });

  readonly saving = signal(false);
  readonly permissionSaving = signal(false);
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly permissionFeedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly assignedPermissions = signal<Permission[]>([]);
  readonly draggedPermission = signal<Permission | null>(null);

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

  readonly availablePermissions = computed(() =>
    this.allPermissions.filter((permission) => !this.assignedPermissions().includes(permission))
  );

  canEditProfile() {
    return this.store.can('edit_profile');
  }

  canManagePermissions() {
    return this.store.can('manage_permissions');
  }

  displayPermission(permission: Permission) {
    return this.permissionLabels[permission] || permission;
  }

  removePermission(permission: Permission) {
    if (!this.canManagePermissions()) {
      return;
    }

    if (this.assignedPermissions().length <= 1) {
      this.permissionFeedback.set({
        type: 'error',
        text: 'At least one assigned access pill must remain on the profile.'
      });
      return;
    }

    this.assignedPermissions.update((current) => current.filter((item) => item !== permission));
    this.permissionFeedback.set(null);
  }

  addPermission(permission: Permission) {
    if (!this.canManagePermissions()) {
      return;
    }

    this.assignedPermissions.update((current) =>
      current.includes(permission) ? current : [...current, permission]
    );
    this.permissionFeedback.set(null);
  }

  startDrag(permission: Permission) {
    if (!this.canManagePermissions()) {
      return;
    }

    this.draggedPermission.set(permission);
  }

  clearDrag() {
    this.draggedPermission.set(null);
  }

  allowPermissionDrop(event: DragEvent) {
    if (!this.canManagePermissions()) {
      return;
    }

    event.preventDefault();
  }

  dropOnAssigned(event: DragEvent) {
    if (!this.canManagePermissions()) {
      return;
    }

    event.preventDefault();
    const permission = this.draggedPermission();
    if (permission) {
      this.addPermission(permission);
    }
    this.clearDrag();
  }

  dropOnSuggested(event: DragEvent) {
    if (!this.canManagePermissions()) {
      return;
    }

    event.preventDefault();
    const permission = this.draggedPermission();
    if (permission) {
      this.removePermission(permission);
    }
    this.clearDrag();
  }

  async saveProfile() {
    if (!this.canEditProfile() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.feedback.set(null);

    const raw = this.form.getRawValue();
    const response = await this.store.updateProfile({
      name: raw.name,
      address: raw.address,
      phoneNumber: raw.phoneNumber,
      email: raw.email,
      twoFactorEnabled: raw.twoFactorEnabled,
      password: raw.password || undefined
    });

    this.saving.set(false);
    this.feedback.set({
      type: response.ok ? 'success' : 'error',
      text: response.message
    });

    if (response.ok) {
      this.form.patchValue({ password: '' }, { emitEvent: false });
    }
  }

  async savePermissions() {
    if (!this.canManagePermissions()) {
      return;
    }

    if (this.assignedPermissions().length < 1) {
      this.permissionFeedback.set({
        type: 'error',
        text: 'At least one assigned access pill must remain on the profile.'
      });
      return;
    }

    this.permissionSaving.set(true);
    this.permissionFeedback.set(null);

    const response = await this.store.updatePermissions(this.assignedPermissions());

    this.permissionSaving.set(false);
    this.permissionFeedback.set({
      type: response.ok ? 'success' : 'error',
      text: response.message
    });
  }
}
