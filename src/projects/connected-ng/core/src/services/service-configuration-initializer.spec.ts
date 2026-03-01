import { TestBed } from '@angular/core/testing';

import { ServiceConfigurationInitializer } from './service-configuration-initializer';

describe('ServiceConfigurationInitializer', () => {
  let service: ServiceConfigurationInitializer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceConfigurationInitializer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
