import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSelectBox } from './user-select-box';

describe('UserSelectBox', () => {
  let component: UserSelectBox;
  let fixture: ComponentFixture<UserSelectBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSelectBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSelectBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
