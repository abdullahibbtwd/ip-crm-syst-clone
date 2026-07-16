import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ContactRole } from '../../../../generated/prisma/client';
import { CreateContactDto } from './contact.dto';

function validate(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateContactDto, payload);
  return validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateContactDto', () => {
  it('accepts a valid minimal payload', () => {
    const errors = validate({
      role: ContactRole.general,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects missing required fields', () => {
    const errors = validate({});
    const props = errors.map((e) => e.property);
    expect(props).toEqual(
      expect.arrayContaining(['role', 'firstName', 'lastName']),
    );
  });

  it('rejects invalid email', () => {
    const errors = validate({
      role: ContactRole.primary,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects unknown properties', () => {
    const errors = validate({
      role: ContactRole.general,
      firstName: 'Ada',
      lastName: 'Lovelace',
      unexpected: true,
    });
    expect(errors.some((e) => e.property === 'unexpected')).toBe(true);
  });
});
