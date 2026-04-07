import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusPillComponent } from './status-pill.component';

describe('StatusPillComponent', () => {
  let fixture: ComponentFixture<StatusPillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusPillComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusPillComponent);
    fixture.componentRef.setInput('status', 'failed');
    fixture.detectChanges();
  });

  it('renders the provided status', () => {
    expect(fixture.nativeElement.textContent.trim()).toBe('failed');
    expect(fixture.nativeElement.querySelector('.failed')).toBeTruthy();
  });
});
