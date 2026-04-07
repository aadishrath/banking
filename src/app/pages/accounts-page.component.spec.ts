import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
  let fixture: ComponentFixture<AccountsPageComponent>;
  let component: AccountsPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('selects the default active account', () => {
    expect(component.activeAccount()?.id).toBe('acct-checking');
  });

  it('updates the active account when selection changes', () => {
    component.activeId.set('acct-savings');
    expect(component.activeAccount()?.name).toBe('Vacation Savings');
  });
});
