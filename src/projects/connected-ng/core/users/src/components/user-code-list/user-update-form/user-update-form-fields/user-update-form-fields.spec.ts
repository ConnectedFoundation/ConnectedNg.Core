import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserUpdateFormFields } from './user-update-form-fields';

describe('UserUpdateFormFields', () => {
  let component: UserUpdateFormFields;
  let fixture: ComponentFixture<UserUpdateFormFields>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserUpdateFormFields]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserUpdateFormFields);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
