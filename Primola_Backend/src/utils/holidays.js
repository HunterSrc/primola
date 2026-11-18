/**
 * Calcolo delle festività nazionali italiane fisse e mobili (Pasqua e Pasquetta).
 * Algoritmo di Meeus/Jones/Butcher per il calcolo della Pasqua cattolica/occidentale.
 */

const FIXED_HOLIDAYS = {
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

/**
 * Calcola la data della Domenica di Pasqua per l'anno specificato (UTC).
 * @param {number} year
 * @returns {Date}
 */
function getEasterSunday(year) {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Marzo, 4 = Aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Restituisce i dettagli della festività nazionale italiana se la data corrisponde, altrimenti null.
 * @param {string|Date} dateInput
 * @returns {{ name: string, isHoliday: boolean } | null}
 */
function getItalianHoliday(dateInput) {
  if (!dateInput) return null;

  let y;
  let m;
  let d;

  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    [y, m, d] = parts;
  } else if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    y = dateInput.getFullYear();
    m = dateInput.getMonth() + 1;
    d = dateInput.getDate();
  } else {
    return null;
  }

  const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (FIXED_HOLIDAYS[mmdd]) {
    return { name: FIXED_HOLIDAYS[mmdd], isHoliday: true };
  }

  const easter = getEasterSunday(y);
  if (
    y === easter.getUTCFullYear() &&
    m === easter.getUTCMonth() + 1 &&
    d === easter.getUTCDate()
  ) {
    return { name: 'Pasqua', isHoliday: true };
  }

  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easter.getUTCDate() + 1);
  if (
    y === easterMonday.getUTCFullYear() &&
    m === easterMonday.getUTCMonth() + 1 &&
    d === easterMonday.getUTCDate()
  ) {
    return { name: "Lunedì dell'Angelo (Pasquetta)", isHoliday: true };
  }

  return null;
}

/**
 * Verifica se la data indicata è una festività nazionale italiana.
 * @param {string|Date} dateInput
 * @returns {boolean}
 */
function isItalianHoliday(dateInput) {
  return getItalianHoliday(dateInput) !== null;
}

module.exports = {
  getItalianHoliday,
  isItalianHoliday,
  getEasterSunday
};
