import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './common/core/core.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/module';
import { FilaModule } from './fila/fila.module';

@Module({
  imports: [ConfigModule, CoreModule, DatabaseModule, HealthModule, FilaModule],
})
export class AppModule {}
