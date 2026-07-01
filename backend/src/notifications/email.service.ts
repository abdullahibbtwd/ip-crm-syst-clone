import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('SMTP_PORT', 587)),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    const from =
      this.config.get('SMTP_FROM') ?? 'IP Consulting CRM <noreply@ipconsulting.bg>';

    if (!this.transporter) {
      this.logger.log(
        `[dev email] To: ${params.to}\nSubject: ${params.subject}\n\n${params.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? `<p>${params.text.replace(/\n/g, '<br>')}</p>`,
    });
  }
}
