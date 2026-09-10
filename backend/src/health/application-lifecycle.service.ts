import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationLifecycleService implements BeforeApplicationShutdown {
  private draining = false;

  isDraining(): boolean {
    return this.draining;
  }

  beforeApplicationShutdown(): void {
    this.draining = true;
  }
}
