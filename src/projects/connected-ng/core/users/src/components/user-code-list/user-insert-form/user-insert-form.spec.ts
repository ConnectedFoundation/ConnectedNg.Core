import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInsertForm } from './user-insert-form';

describe('UserInsertForm', () => {
  let component: UserInsertForm;
  let fixture: ComponentFixture<UserInsertForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInsertForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInsertForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
