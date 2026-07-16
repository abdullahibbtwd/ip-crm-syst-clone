import { DeadlineStatus } from '../../generated/prisma/client';
import {
  DEADLINE_REMINDER_MILESTONES,
  MAX_DAYS_AFTER_REMINDER,
  MAX_DAYS_BEFORE_REMINDER,
  OVERDUE_CATCHUP_MILESTONE,
  daysUntilDue,
  isEligibleForMilestone,
  milestoneMatches,
  parseRemindersSent,
  reminderBody,
  reminderEmailSubject,
  reminderTitle,
} from './deadline-reminder.utils';

describe('deadline-reminder.utils', () => {
  const before30 = DEADLINE_REMINDER_MILESTONES.find(
    (m) => m.key === 'before_30',
  )!;
  const dueToday = DEADLINE_REMINDER_MILESTONES.find(
    (m) => m.key === 'due_today',
  )!;
  const before1 = DEADLINE_REMINDER_MILESTONES.find(
    (m) => m.key === 'before_1',
  )!;
  const after3 = DEADLINE_REMINDER_MILESTONES.find((m) => m.key === 'after_3')!;

  it('exposes expected schedule constants', () => {
    expect(OVERDUE_CATCHUP_MILESTONE).toBe('overdue');
    expect(MAX_DAYS_BEFORE_REMINDER).toBe(30);
    expect(MAX_DAYS_AFTER_REMINDER).toBe(3);
    expect(DEADLINE_REMINDER_MILESTONES).toHaveLength(6);
  });

  describe('daysUntilDue', () => {
    it('uses whole calendar days', () => {
      const from = new Date(2026, 0, 10);
      const due = new Date(2026, 0, 13);
      expect(daysUntilDue(due, from)).toBe(3);
    });
  });

  describe('milestoneMatches', () => {
    it('matches before milestones by positive offset', () => {
      expect(milestoneMatches(before30, 30)).toBe(true);
      expect(milestoneMatches(before30, 29)).toBe(false);
      expect(milestoneMatches(dueToday, 0)).toBe(true);
    });

    it('matches after milestones by negative offset', () => {
      expect(milestoneMatches(after3, -3)).toBe(true);
      expect(milestoneMatches(after3, 3)).toBe(false);
    });
  });

  describe('isEligibleForMilestone', () => {
    it('allows pending/in_progress for before milestones', () => {
      expect(isEligibleForMilestone(DeadlineStatus.pending, before30)).toBe(
        true,
      );
      expect(
        isEligibleForMilestone(DeadlineStatus.in_progress, dueToday),
      ).toBe(true);
      expect(isEligibleForMilestone(DeadlineStatus.missed, before30)).toBe(
        false,
      );
      expect(isEligibleForMilestone(DeadlineStatus.completed, before30)).toBe(
        false,
      );
    });

    it('allows missed/escalated for after milestones', () => {
      expect(isEligibleForMilestone(DeadlineStatus.missed, after3)).toBe(true);
      expect(isEligibleForMilestone(DeadlineStatus.escalated, after3)).toBe(
        true,
      );
      expect(isEligibleForMilestone(DeadlineStatus.completed, after3)).toBe(
        false,
      );
    });
  });

  describe('parseRemindersSent', () => {
    it('returns only string entries from arrays', () => {
      expect(parseRemindersSent(['before_30', 1, null, 'due_today'])).toEqual([
        'before_30',
        'due_today',
      ]);
      expect(parseRemindersSent(null)).toEqual([]);
      expect(parseRemindersSent({ key: 'x' })).toEqual([]);
    });
  });

  describe('reminder copy helpers', () => {
    it('builds titles for before/today/tomorrow/after', () => {
      expect(reminderTitle(before30, 'OA response')).toBe(
        'Deadline in 30 days: OA response',
      );
      expect(reminderTitle(before1, 'OA response')).toBe(
        'Deadline tomorrow: OA response',
      );
      expect(reminderTitle(dueToday, 'OA response')).toBe(
        'Deadline due today: OA response',
      );
      expect(reminderTitle(after3, 'OA response')).toBe(
        'Deadline overdue: OA response',
      );
    });

    it('builds bodies', () => {
      expect(reminderBody(before30, 'Matter A', '2026-02-01')).toBe(
        'Matter A - due 2026-02-01 (in 30 days).',
      );
      expect(reminderBody(before1, 'Matter A', '2026-02-01')).toBe(
        'Matter A - due 2026-02-01 (tomorrow).',
      );
      expect(reminderBody(dueToday, 'Matter A', '2026-02-01')).toBe(
        'Matter A - due today (2026-02-01).',
      );
      expect(reminderBody(after3, 'Matter A', '2026-02-01')).toBe(
        'Matter A was due 2026-02-01 (3 days overdue).',
      );
    });

    it('builds email subjects', () => {
      expect(reminderEmailSubject(before30, 'OA', '2026-02-01')).toBe(
        'Reminder: OA due in 30 days (2026-02-01)',
      );
      expect(reminderEmailSubject(before1, 'OA', '2026-02-01')).toBe(
        'Reminder: OA due tomorrow (2026-02-01)',
      );
      expect(reminderEmailSubject(dueToday, 'OA', '2026-02-01')).toBe(
        'Due today: OA (2026-02-01)',
      );
      expect(reminderEmailSubject(after3, 'OA', '2026-02-01')).toBe(
        'Overdue (3 days overdue): OA',
      );
    });
  });
});
