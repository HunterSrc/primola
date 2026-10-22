import { describe, it, expect } from 'vitest';
import { AppDatePipe } from './app-date.pipe';

describe('AppDatePipe', () => {
  const pipe = new AppDatePipe();

  it('should return "-" for empty or null values', () => {
    expect(pipe.transform(null)).toBe('-');
    expect(pipe.transform(undefined)).toBe('-');
    expect(pipe.transform('')).toBe('-');
  });

  it('should format YYYY-MM-DD string to dd/MM/yyyy by default', () => {
    expect(pipe.transform('2026-10-22')).toBe('22/10/2026');
    expect(pipe.transform('2025-05-09')).toBe('09/05/2025');
  });

  it('should format Date instance to dd/MM/yyyy', () => {
    const d = new Date(2026, 9, 22); // Month is 0-indexed, 9 = October
    expect(pipe.transform(d)).toBe('22/10/2026');
  });

  it('should format datetime correctly', () => {
    const d = new Date(2026, 9, 22, 14, 30);
    expect(pipe.transform(d, 'datetime')).toBe('22/10/2026 14:30');
  });

  it('should format full date in Italian', () => {
    const result = pipe.transform('2026-10-22', 'full');
    expect(result.toLowerCase()).toContain('ottobre');
    expect(result).toContain('2026');
  });

  it('should return original string if date parsing fails', () => {
    expect(pipe.transform('invalid-date')).toBe('invalid-date');
  });
});
