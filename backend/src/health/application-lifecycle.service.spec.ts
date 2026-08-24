import { ApplicationLifecycleService } from './application-lifecycle.service';

describe('ApplicationLifecycleService', () => {
  it('switches the instance to draining before shutdown', () => {
    const service = new ApplicationLifecycleService();

    expect(service.isDraining()).toBe(false);
    service.beforeApplicationShutdown();
    expect(service.isDraining()).toBe(true);
  });
});
