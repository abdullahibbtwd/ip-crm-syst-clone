/** Brand tokens aligned with frontend (index.css). */
const BRAND = {
  green: '#1a3c34',
  greenMuted: '#5a726c',
  orange: '#e8621a',
  light: '#f4f6f3',
  white: '#ffffff',
  border: '#d8e0dc',
  cardBg: '#eef1ee',
} as const;

const FIRM_NAME = 'IP Consulting CRM';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type TransactionalEmailContent = {
  preheader: string;
  eyebrow?: string;
  title: string;
  greeting: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryHtml?: string;
  footerNote: string;
};

/**
 * Responsive, table-based transactional email shell for Resend / major clients.
 */
export function renderTransactionalEmail(content: TransactionalEmailContent): string {
  const {
    preheader,
    eyebrow = 'IP Consulting',
    title,
    greeting,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    secondaryHtml,
    footerNote,
  } = content;

  const safeUrl = escapeHtml(ctaUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .cta-btn { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.light};font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.light};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px;max-width:560px;">
          <!-- Brand bar -->
          <tr>
            <td style="background-color:${BRAND.green};border-radius:16px 16px 0 0;padding:28px 36px;" class="email-pad">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.65);">
                      ${escapeHtml(eyebrow)}
                    </p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;color:${BRAND.white};font-weight:normal;">
                      ${escapeHtml(FIRM_NAME)}
                    </p>
                  </td>
                  <td align="right" valign="middle" width="48">
                    <div style="width:40px;height:40px;border-radius:10px;background-color:${BRAND.orange};text-align:center;line-height:40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:${BRAND.white};">
                      IP
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent stripe -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${BRAND.orange} 0%, #f0a06a 100%);background-color:${BRAND.orange};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:${BRAND.white};padding:36px 36px 28px 36px;" class="email-pad">
              <h1 style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;color:${BRAND.green};font-weight:normal;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.green};">
                ${escapeHtml(greeting)}
              </p>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.greenMuted};">
                ${bodyHtml}
              </div>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px 0;">
                <tr>
                  <td align="center" bgcolor="${BRAND.orange}" style="border-radius:10px;background-color:${BRAND.orange};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="20%" stroke="f" fillcolor="${BRAND.orange}">
                      <w:anchorlock/>
                      <center style="color:${BRAND.white};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">
                        ${escapeHtml(ctaLabel)}
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a class="cta-btn" href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:10px;background-color:${BRAND.orange};">
                      ${escapeHtml(ctaLabel)}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.greenMuted};word-break:break-all;">
                Or copy this link:<br />
                <a href="${safeUrl}" style="color:${BRAND.orange};text-decoration:underline;">${safeUrl}</a>
              </p>

              ${
                secondaryHtml
                  ? `<div style="margin-top:28px;padding:18px 20px;background-color:${BRAND.cardBg};border-radius:12px;border:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${BRAND.green};">
                      ${secondaryHtml}
                    </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.white};border-top:1px solid ${BRAND.border};border-radius:0 0 16px 16px;padding:24px 36px 32px 36px;" class="email-pad">
              <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${BRAND.greenMuted};">
                ${escapeHtml(footerNote)}
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.greenMuted};">
                © ${year} ${escapeHtml(FIRM_NAME)} · European Trademark &amp; Patent Attorneys
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInviteEmail(params: {
  fullName: string;
  inviteUrl: string;
}): { subject: string; text: string; html: string } {
  const { fullName, inviteUrl } = params;
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;

  const subject = `You're invited to ${FIRM_NAME}`;
  const text = [
    `Hello ${fullName},`,
    '',
    `You have been invited to access ${FIRM_NAME}.`,
    '',
    'Set your password using this link (expires in 7 days):',
    inviteUrl,
    '',
    'Or sign in with your Microsoft or Google account using this exact email address.',
    '',
    'If you did not expect this invitation, you can ignore this email.',
  ].join('\n');

  const html = renderTransactionalEmail({
    preheader: `Set up your ${FIRM_NAME} account — password link expires in 7 days.`,
    title: 'Welcome aboard',
    greeting: `Hello ${firstName},`,
    bodyHtml: `<p style="margin:0 0 12px 0;">You've been invited to access <strong style="color:${BRAND.green};">${escapeHtml(FIRM_NAME)}</strong> — your workspace for IP matters, deadlines, and collaboration.</p>
<p style="margin:0;">Use the button below to set your password. This link expires in <strong style="color:${BRAND.green};">7 days</strong>.</p>`,
    ctaLabel: 'Set your password',
    ctaUrl: inviteUrl,
    secondaryHtml: `<p style="margin:0 0 8px 0;font-weight:700;color:${BRAND.green};">Prefer single sign-on?</p>
<p style="margin:0;color:${BRAND.greenMuted};">You can also sign in with <strong style="color:${BRAND.green};">Microsoft</strong> or <strong style="color:${BRAND.green};">Google</strong> using this exact email address — no password required.</p>`,
    footerNote:
      'If you did not expect this invitation, you can safely ignore this email. No account changes will be made.',
  });

  return { subject, text, html };
}

export function buildPasswordResetEmail(params: {
  fullName: string;
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const { fullName, resetUrl } = params;
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;

  const subject = `Reset your ${FIRM_NAME} password`;
  const text = [
    `Hello ${fullName},`,
    '',
    'We received a request to reset your password. Open this link within one hour:',
    resetUrl,
    '',
    'If you did not request a password reset, you can ignore this email.',
  ].join('\n');

  const html = renderTransactionalEmail({
    preheader: 'Reset your password — this secure link expires in one hour.',
    title: 'Reset your password',
    greeting: `Hello ${firstName},`,
    bodyHtml: `<p style="margin:0 0 12px 0;">We received a request to reset the password for your <strong style="color:${BRAND.green};">${escapeHtml(FIRM_NAME)}</strong> account.</p>
<p style="margin:0;">Click the button below to choose a new password. This link expires in <strong style="color:${BRAND.green};">one hour</strong>.</p>`,
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    footerNote:
      'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
  });

  return { subject, text, html };
}
