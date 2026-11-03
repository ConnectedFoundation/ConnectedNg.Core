import { eventRetryDelay } from './event-service';

describe('eventRetryDelay', () => {
  it('retries at once the first time, so a replaced server is found straight away', () => {
    expect(eventRetryDelay(0)).toBe(0);
  });

  it('backs off after that', () => {
    expect([1, 2].map(eventRetryDelay)).toEqual([1000, 2000]);
  });

  it('settles on a fixed delay and never gives up', () => {
    expect([3, 4, 50, 5000].map(eventRetryDelay)).toEqual([5000, 5000, 5000, 5000]);
  });
});
