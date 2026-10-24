/**
 * Calcolo delle festività italiane fisse e mobili (Pasquetta).
 * Algoritmo di Meeus/Jones/Butcher per il calcolo della Pasqua cattolica/occidentale.
 */

export interface ItalianHoliday {
  name: string;
  isHoliday: boolean;
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Marzo, 4=Aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Restituisce i dettagli della festività se la data è una festività nazionale italiana, altrimenti null.
 */
export function getItalianHoliday(dateInput: string | Date): ItalianHoliday | null {
  if (!dateInput) return null;

  let y: number, m: number, d: number;
  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return null;
    [y, m, d] = parts;
  } else {
    y = dateInput.getFullYear();
    m = dateInput.getMonth() + 1;
    d = dateInput.getDate();
  }

  const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Festività fisse nazionali italiane
  const fixedHolidays: Record<string, string> = {
    '01-01': 'Capodanno',
    '01-06': 'Epifania',
    '04-25': 'Festa della Liberazione',
    '05-01': 'Festa del Lavoro',
    '06-02': 'Festa della Repubblica',
    '08-15': 'Ferragosto (Assunzione)',
    '11-01': 'Tutti i Santi',
    '12-08': 'Immacolata Concezione',
    '12-25': 'Natale',
    '12-26': 'Santo Stefano'
  };

  if (fixedHolidays[mmdd]) {
    return { name: fixedHolidays[mmdd], isHoliday: true };
  }

  // Festività mobile: Lunedì dell'Angelo (Pasquetta = Pasqua + 1 giorno)
  const easter = getEasterSunday(y);
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easter.getUTCDate() + 1);

  const emYear = easterMonday.getUTCFullYear();
  const emMonth = easterMonday.getUTCMonth() + 1;
  const emDay = easterMonday.getUTCDate();

  if (y === emYear && m === emMonth && d === emDay) {
    return { name: "Lunedì dell'Angelo (Pasquetta)", isHoliday: true };
  }

  return null;
}
