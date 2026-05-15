import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserCodeListHeader } from './user-code-list-header';

describe('UserCodeListHeader', () => {
  let component: UserCodeListHeader;
  let fixture: ComponentFixture<UserCodeListHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCodeListHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserCodeListHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
