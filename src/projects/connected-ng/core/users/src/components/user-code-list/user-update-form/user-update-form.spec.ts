import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserUpdateForm } from './user-update-form';

describe('UserUpdateForm', () => {
  let component: UserUpdateForm;
  let fixture: ComponentFixture<UserUpdateForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserUpdateForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserUpdateForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
