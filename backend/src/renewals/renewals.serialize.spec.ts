import { MatterType } from '../../generated/prisma/client';
import {
  serializeRenewalPart,
  serializeRenewalWindowList,
} from './renewals.serialize';

describe('renewals.serialize', () => {
  it('serializes renewal parts with decimal fees', () => {
    const result = serializeRenewalPart({
      id: 'p1',
      renewalWindowId: 'rw1',
      jurisdiction: 'EU',
      niceClasses: [1],
      status: 'upcoming',
      officialFee: { toString: () => '850.00' },
      serviceFee: { toString: () => '200.00' },
      currency: 'EUR',
      dueDate: new Date('2030-01-01'),
      graceDate: null,
      notes: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.officialFee).toBe(850);
    expect(result.serviceFee).toBe(200);
  });

  it('serializes renewal window list with nested parts', () => {
    const result = serializeRenewalWindowList({
      id: 'rw1',
      ipRightId: 'ipr1',
      matterId: 'm1',
      clientId: 'c1',
      cycleNumber: 1,
      jurisdiction: 'EU',
      dueDate: new Date('2030-01-01'),
      graceDate: null,
      status: 'upcoming',
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipRight: {
        id: 'ipr1',
        title: 'Mark',
        registrationNumber: 'REG-1',
        jurisdiction: 'EU',
      },
      parts: [
        {
          id: 'p1',
          renewalWindowId: 'rw1',
          jurisdiction: 'BG',
          niceClasses: [],
          status: 'upcoming',
          officialFee: null,
          serviceFee: null,
          currency: 'EUR',
          dueDate: new Date('2030-01-01'),
          graceDate: null,
          notes: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as never);

    expect(result.parts).toHaveLength(1);
    expect(result.ipRight.title).toBe('Mark');
  });
});
