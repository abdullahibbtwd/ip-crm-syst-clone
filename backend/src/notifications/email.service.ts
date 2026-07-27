import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailProvider = 'resend' | 'smtp' | 'console';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;
  private readonly defaultFrom: string;
  private resend: Resend | null = null;
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    this.defaultFrom =
      this.config.get('RESEND_FROM') ??
      this.config.get('SMTP_FROM') ??
      'IP Consulting CRM <noreply@ipconsulting.bg>';

    if (resendKey) {
      this.provider = 'resend';
      this.resend = new Resend(resendKey);
    } else if (smtpHost) {
      this.provider = 'smtp';
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.config.get('SMTP_PORT', 587)),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
    } else {
      this.provider = 'console';
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    if (this.provider === 'console') {
      this.logger.log(
        `[dev email] To: ${params.to}\nSubject: ${params.subject}\n\n${params.text}`,
      );
      return;
    }

    if (this.provider === 'resend' && this.resend) {
      const { error } = await this.resend.emails.send({
        from: this.defaultFrom,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html ?? `<p>${params.text.replace(/\n/g, '<br>')}</p>`,
      });

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.defaultFrom,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html ?? `<p>${params.text.replace(/\n/g, '<br>')}</p>`,
      });
    }
  }
}
