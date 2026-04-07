import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityPageComponent } from './activity-page.component';
import { BankingStoreService } from '../core/banking-store.service';

describe('ActivityPageComponent', () => {
  let fixture: ComponentFixture<ActivityPageComponent>;
  let component: ActivityPageComponent;
  let store: BankingStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityPageComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(BankingStoreService);
    fixture.detectChanges();
  });

  it('shows all activity by default', () => {
    expect(component.filteredActivity().length).toBe(store.activity().length);
  });

  it('filters by status and channel', () => {
    component.statusFilter.set('success');
    component.channelFilter.set('app');

    expect(component.filteredActivity().every((entry) => entry.status === 'success')).toBeTrue();
    expect(component.filteredActivity().every((entry) => entry.channel === 'app')).toBeTrue();
  });
});
