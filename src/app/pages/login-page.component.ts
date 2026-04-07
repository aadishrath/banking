import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly store = inject(BankingStoreService);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    username: [this.store.demoUsers()[0].username, [Validators.required]],
    password: [this.store.demoUsers()[0].password, [Validators.required]]
  });
  readonly demoUsers = this.store.demoUsers;

  selectDemoUser(username: string, password: string) {
    this.form.setValue({ username, password });
    this.errorMessage.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
  }

  async submit() {
    const credentials = this.form.getRawValue();
    const result = await this.store.login(credentials.username, credentials.password);
    if (!result.ok) {
      this.errorMessage.set(result.message);
      return;
    }

    this.errorMessage.set('');
    this.router.navigateByUrl('/dashboard');
  }
}
