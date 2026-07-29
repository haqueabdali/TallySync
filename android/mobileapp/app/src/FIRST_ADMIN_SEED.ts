import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { UserRole } from './users/user-role.enum';
import { UsersService } from './users/users.service';

async function seedFirstAdmin(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const admin = await usersService.create({
      email: 'admin@example.com',
      fullName: 'System Administrator',
      password: 'ChangeThisPassword123!',
      role: UserRole.ADMIN,
      isActive: true,
    });

    console.log('Administrator created:', admin.email);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : error,
    );
  } finally {
    await app.close();
  }
}

void seedFirstAdmin();
