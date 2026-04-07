import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
  });

  it('renders the user profile details', () => {
    expect(fixture.nativeElement.textContent).toContain('Ava Morgan');
    expect(fixture.nativeElement.textContent).toContain('ava.morgan@luminatebank.demo');
  });
});
