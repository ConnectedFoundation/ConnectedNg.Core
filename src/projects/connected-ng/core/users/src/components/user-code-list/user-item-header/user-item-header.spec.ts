import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserItemHeader } from './user-item-header';

describe('UserItemHeader', () => {
  let component: UserItemHeader;
  let fixture: ComponentFixture<UserItemHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserItemHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserItemHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
