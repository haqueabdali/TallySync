# AppModule TypeORM Integration

Do not replace the whole AppModule.

Find the current runtime database registration, normally:

```ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    // ...
  }),
})
```

Import:

```ts
import { ConfigService } from '@nestjs/config';
import { createDatabaseOptions } from './database/config/database-options';
```

Then replace only the `useFactory` body:

```ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (
    config: ConfigService,
  ) => createDatabaseOptions(config),
})
```

Do not add `synchronize: true` anywhere.

Do not set `migrationsRun: true` for the API process.

Each feature module should continue registering its entities with:

```ts
TypeOrmModule.forFeature([
  SomeEntity,
])
```

`autoLoadEntities: true` collects those runtime entities without maintaining
a second large entity list in AppModule.
