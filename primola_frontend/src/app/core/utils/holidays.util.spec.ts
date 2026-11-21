import { describe, it, expect } from 'vitest';
import { getItalianHoliday } from './holidays.util';

describe('holidays.util', () => {
  describe('getItalianHoliday', () => {
    it('should return null for null, undefined, or empty inputs', () => {
      expect(getItalianHoliday(null as any)).toBeNull();
      expect(getItalianHoliday(undefined as any)).toBeNull();
      expect(getItalianHoliday('')).toBeNull();
    });

    it('should return null for malformed date strings', () => {
      expect(getItalianHoliday('not-a-date')).toBeNull();
      expect(getItalianHoliday('2026-05')).toBeNull();
      expect(getItalianHoliday('2026')).toBeNull();
      expect(getItalianHoliday('abc-01-01')).toBeNull();
      expect(getItalianHoliday('invalid')).toBeNull();
    });

    it('should return null for ordinary non-holiday days (string and Date)', () => {
      expect(getItalianHoliday('2026-02-15')).toBeNull();
      expect(getItalianHoliday('2026-07-22')).toBeNull();
      expect(getItalianHoliday('2026-12-24')).toBeNull(); // Vigilia di Natale is not a national holiday

      const regularDate = new Date(2026, 1, 15); // 15 Feb 2026
      expect(getItalianHoliday(regularDate)).toBeNull();
    });

    it('should identify all fixed Italian national holidays from string formatted YYYY-MM-DD', () => {
      const fixedHolidays = [
        { date: '2026-01-01', name: 'Capodanno' },
        { date: '2026-01-06', name: 'Epifania' },
        { date: '2026-04-25', name: 'Festa della Liberazione' },
        { date: '2026-05-01', name: 'Festa del Lavoro' },
        { date: '2026-06-02', name: 'Festa della Repubblica' },
        { date: '2026-08-15', name: 'Ferragosto (Assunzione)' },
        { date: '2026-11-01', name: 'Tutti i Santi' },
        { date: '2026-12-08', name: 'Immacolata Concezione' },
        { date: '2026-12-25', name: 'Natale' },
        { date: '2026-12-26', name: 'Santo Stefano' }
      ];

      for (const h of fixedHolidays) {
        const result = getItalianHoliday(h.date);
        expect(result).toEqual({ name: h.name, isHoliday: true });
      }
    });

    it('should identify fixed holidays from ISO string containing time', () => {
      const result = getItalianHoliday('2026-01-01T14:30:00.000Z');
      expect(result).toEqual({ name: 'Capodanno', isHoliday: true });
    });

    it('should identify fixed holidays from Date instances', () => {
      // Month in JS Date is 0-indexed: 0 = January, 11 = December
      const capodanno = new Date(2026, 0, 1);
      expect(getItalianHoliday(capodanno)).toEqual({ name: 'Capodanno', isHoliday: true });

      const ferragosto = new Date(2026, 7, 15);
      expect(getItalianHoliday(ferragosto)).toEqual({ name: 'Ferragosto (Assunzione)', isHoliday: true });

      const natale = new Date(2026, 11, 25);
      expect(getItalianHoliday(natale)).toEqual({ name: 'Natale', isHoliday: true });
    });

    it('should correctly calculate Easter Monday (Pasquetta) across different years', () => {
      // 2024: Easter March 31 -> Pasquetta April 1
      expect(getItalianHoliday('2024-04-01')).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });

      // 2025: Easter April 20 -> Pasquetta April 21
      expect(getItalianHoliday('2025-04-21')).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });

      // 2026: Easter April 5 -> Pasquetta April 6
      expect(getItalianHoliday('2026-04-06')).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });

      // 2027: Easter March 28 -> Pasquetta March 29
      expect(getItalianHoliday('2027-03-29')).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });

      // 2028: Easter April 16 -> Pasquetta April 17
      expect(getItalianHoliday('2028-04-17')).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });
    });

    it('should recognize Pasquetta when passed as Date object', () => {
      const pasquetta2026 = new Date(2026, 3, 6); // April 6, 2026
      expect(getItalianHoliday(pasquetta2026)).toEqual({
        name: "Lunedì dell'Angelo (Pasquetta)",
        isHoliday: true
      });
    });

    it('should return null for Easter Sunday (Pasqua is Sunday, not Pasquetta)', () => {
      // 2026-04-05 is Easter Sunday
      expect(getItalianHoliday('2026-04-05')).toBeNull();
      // 2024-03-31 is Easter Sunday
      expect(getItalianHoliday('2024-03-31')).toBeNull();
    });
  });
});
