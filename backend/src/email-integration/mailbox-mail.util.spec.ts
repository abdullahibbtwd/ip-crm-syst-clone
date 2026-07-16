import {
  extractEmailAddress,
  htmlToPlainText,
  plainTextToHtml,
  replySubject,
} from './mailbox-mail.util';

describe('mailbox-mail.util', () => {
  describe('extractEmailAddress', () => {
    it('extracts address from angle brackets', () => {
      expect(extractEmailAddress('Ada Lovelace <ada@example.com>')).toBe(
        'ada@example.com',
      );
    });

    it('returns trimmed bare addresses', () => {
      expect(extractEmailAddress('  ada@example.com  ')).toBe('ada@example.com');
    });
  });

  describe('replySubject', () => {
    it('prefixes Re: when missing', () => {
      expect(replySubject('Office action')).toBe('Re: Office action');
    });

    it('does not double-prefix Re:', () => {
      expect(replySubject('Re: already')).toBe('Re: already');
      expect(replySubject('RE: caps')).toBe('RE: caps');
    });

    it('uses a placeholder for empty subjects', () => {
      expect(replySubject('   ')).toBe('Re: (No subject)');
    });
  });

  describe('plainTextToHtml / htmlToPlainText', () => {
    it('escapes HTML and converts newlines', () => {
      expect(plainTextToHtml('a <b> & "c"\nd')).toBe(
        '<div>a &lt;b&gt; &amp; &quot;c&quot;<br/>d</div>',
      );
    });

    it('strips tags and restores entities', () => {
      expect(htmlToPlainText('<p>Hello&nbsp;world</p><br/>&amp;')).toBe(
        'Hello world\n\n\n&',
      );
    });
  });
});
