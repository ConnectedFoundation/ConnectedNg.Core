import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserCodeList } from './user-code-list';

describe('UserCodeList', () => {
  let component: UserCodeList;
  let fixture: ComponentFixture<UserCodeList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCodeList]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UserCodeList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
