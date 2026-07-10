import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { resolve } from 'node:path';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { IntakeModule } from './intake/intake.module';
import { MattersModule } from './matters/matters.module';
import { DeadlinesModule } from './deadlines/deadlines.module';
import { DocumentsModule } from './documents/documents.module';
import { CorrespondenceModule } from './correspondence/correspondence.module';
import { BillingModule } from './billing/billing.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertsModule } from './alerts/alerts.module';
import { IpRightsModule } from './ip-rights/ip-rights.module';
import { WatchModule } from './watch/watch.module';
import { RetentionModule } from './retention/retention.module';
import { EmailIntegrationModule } from './email-integration/email-integration.module';
import { BroadcastsModule } from './broadcasts/broadcasts.module';
import { SearchModule } from './search/search.module';
import { PdfModule } from './pdf/pdf.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { McpModule } from './mcp/mcp.module';
import { RegistryModule } from './registry/registry.module';
import { AppController } from './app.controller';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PortalAccessModule } from './common/portal-access.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '../.env'),
        resolve(process.cwd(), '.env'),
      ],
    }),
    PrismaModule,
    PortalAccessModule,
    AuditModule,
    AuthModule,
    CrmModule,
    IntakeModule,
    MattersModule,
    DeadlinesModule,
    DocumentsModule,
    CorrespondenceModule,
    BillingModule,
    InvoicesModule,
    NotificationsModule,
    AlertsModule,
    IpRightsModule,
    WatchModule,
    RetentionModule,
    EmailIntegrationModule,
    BroadcastsModule,
    SearchModule,
    PdfModule,
    TasksModule,
    StorageModule,
    ReportsModule,
    UsersModule,
    AiModule,
    McpModule,
    RegistryModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
