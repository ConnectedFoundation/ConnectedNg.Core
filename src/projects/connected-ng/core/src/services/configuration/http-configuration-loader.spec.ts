import { TestBed } from '@angular/core/testing';

import { HttpConfigurationLoader } from './http-configuration-loader';

describe('HttpConfigurationLoader', () => {
  let service: HttpConfigurationLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpConfigurationLoader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
