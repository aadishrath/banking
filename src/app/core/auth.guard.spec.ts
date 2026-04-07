import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { BankingStoreService } from './banking-store.service';

describe('authGuard', () => {
  let store: BankingStoreService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue({ redirected: true } as never);

    TestBed.configureTestingModule({
      providers: [
        BankingStoreService,
        { provide: Router, useValue: router }
      ]
    });

    store = TestBed.inject(BankingStoreService);
  });

  it('allows authenticated users through', () => {
    store.login('demo', 'banking2026');
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBeTrue();
  });

  it('redirects guests to login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ redirected: true } as never);
  });
});
