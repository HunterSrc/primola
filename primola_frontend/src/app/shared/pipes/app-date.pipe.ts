import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appDate',
  standalone: true
})
export class AppDatePipe implements PipeTransform {
  /**
   * Formatta date e timestamp per l'applicazione Primola.
   * 
   * Formati supportati:
   * - 'date' (default): 'dd/MM/yyyy' (es. 22/10/2026)
   * - 'datetime': 'dd/MM/yyyy HH:mm' (es. 22/10/2026 14:30)
   * - 'full': 'Lunedì 22 Ottobre 2026'
   * - 'monthYear': 'Ottobre 2026'
   * - 'time': 'HH:mm'
   */
  transform(
    value: string | number | Date | null | undefined,
    format: 'date' | 'datetime' | 'full' | 'monthYear' | 'time' = 'date'
  ): string {
    if (!value) return '-';

    // Se è una data stringa 'YYYY-MM-DD' pura e richiediamo 'date'
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) && format === 'date') {
      const [year, month, day] = value.trim().split('-');
      return `${day}/${month}/${year}`;
    }

    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else if (typeof value === 'string') {
      // Se è solo data 'YYYY-MM-DD', forziamo mezzogiorno per evitare sfalsamenti di fuso orario con UTC
      if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        const [y, m, d] = value.trim().split('-').map(Number);
        date = new Date(y, m - 1, d, 12, 0, 0);
      } else {
        date = new Date(value);
      }
    } else {
      return '-';
    }

    if (isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '-';
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    switch (format) {
      case 'datetime':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case 'time':
        return `${hours}:${minutes}`;
      case 'full':
        return date.toLocaleDateString('it-IT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'monthYear':
        return date.toLocaleDateString('it-IT', {
          month: 'long',
          year: 'numeric'
        });
      case 'date':
      default:
        return `${day}/${month}/${year}`;
    }
  }
}
