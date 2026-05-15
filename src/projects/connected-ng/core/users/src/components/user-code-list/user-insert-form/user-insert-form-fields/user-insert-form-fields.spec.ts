import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInsertFormFields } from './user-insert-form-fields';

describe('UserInsertFormFields', () => {
  let component: UserInsertFormFields;
  let fixture: ComponentFixture<UserInsertFormFields>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInsertFormFields]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInsertFormFields);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
