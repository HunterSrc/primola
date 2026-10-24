const { chromium } = require('../primola_frontend/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const setAuthUser = async (role = 'ADMIN', groups = ['ADMIN']) => {
    await page.evaluate(({ role, groups }) => {
      const user = {
        id: '1',
        email: 'admin@primola.it',
        first_name: 'Admin',
        last_name: 'Primola',
        role: role,
        groups: groups,
        token: 'mock-jwt-token'
      };
      localStorage.setItem('primola_user', JSON.stringify(user));
      localStorage.setItem('jwt_token', 'mock-jwt-token');
      localStorage.setItem('jwt_refresh_token', 'mock-refresh-token');
    }, { role, groups });
  };

  await page.goto('http://localhost:4200/login');
  await setAuthUser('ADMIN', ['ADMIN']);

  // Modale Studente Extra in Presenze
  await page.goto('http://localhost:4200/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const extraBtn = await page.getByRole('button', { name: /extra/i }).first();
  if (await extraBtn.isVisible()) {
    await extraBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/manuale_uso/screenshots/02b_modale_studente_extra.png' });
    console.log('02b_modale_studente_extra.png captured');
  }

  // Anagrafica: Nuovo Studente
  await page.goto('http://localhost:4200/anagrafica', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const nuovoStudenteBtn = await page.getByRole('button', { name: /nuovo studente|aggiungi/i }).first();
  if (await nuovoStudenteBtn.isVisible()) {
    await nuovoStudenteBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/manuale_uso/screenshots/03b_nuovo_studente_form.png' });
    console.log('03b_nuovo_studente_form.png captured');
  }

  // Calendario: Dettaglio Giorno / Turno
  await page.goto('http://localhost:4200/afterschool-calendar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Clicca sul primo giorno utile
  const dayCell = await page.$('.calendar-day, td.day-cell, [class*="day"]');
  if (dayCell) {
    await dayCell.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/manuale_uso/screenshots/04b_dettaglio_giorno_calendario.png' });
    console.log('04b_dettaglio_giorno_calendario.png captured');
  }

  await browser.close();
  console.log('All detailed screenshots captured!');
})();
