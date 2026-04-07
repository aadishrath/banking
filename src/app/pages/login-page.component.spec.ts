import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { BankingStoreService } from '../core/banking-store.service';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let router: jasmine.SpyObj<Router>;
  let store: BankingStoreService;

  beforeEach(async () => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [{ provide: Router, useValue: router }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(BankingStoreService);
    fixture.detectChanges();
  });

  it('creates with demo credentials prefilled', () => {
    expect(component.form.getRawValue()).toEqual({
      username: 'demo',
      password: 'banking2026'
    });
  });

  it('shows an error on invalid login', () => {
    component.form.setValue({ username: 'bad', password: 'bad' });
    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Use demo');
    expect(store.isAuthenticated()).toBeFalse();
  });

  it('navigates on successful login', () => {
    component.submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(store.isAuthenticated()).toBeTrue();
  });
});
