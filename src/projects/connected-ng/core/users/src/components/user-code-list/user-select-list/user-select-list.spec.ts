import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSelectList } from './user-select-list';

describe('UserSelectList', () => {
  let component: UserSelectList;
  let fixture: ComponentFixture<UserSelectList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSelectList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSelectList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
