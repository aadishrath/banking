import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  standalone: true,
  template: ''
})
class DummyComponent {}

describe('AppShellComponent', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let component: AppShellComponent;
  let router: Router;
  let store: BankingStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([{ path: 'login', component: DummyComponent }])]
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(BankingStoreService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    store.login('demo', 'banking2026');
    fixture.detectChanges();
  });

  it('renders the navigation shell', () => {
    expect(component.navigation.length).toBe(5);
    expect(component.firstName()).toBe('Ava');
  });

  it('logs out and redirects to login', () => {
    component.logout();
    expect(store.isAuthenticated()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
