const db = require('../config/database');

const formatDateOnly = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

class MealTariffRepository {
  /**
   * Restituisce tutte le tariffe mensa ordinate dalla più recente alla più vecchia
   */
  async findAll() {
    const query = `
      SELECT id, price, valid_from, valid_to, notes, created_at, updated_at
      FROM meal_tariffs
      ORDER BY valid_from DESC, valid_to DESC
    `;
    const result = await db.query(query);
    return result.rows.map(r => ({
      ...r,
      price: Number(r.price),
      valid_from: formatDateOnly(r.valid_from),
      valid_to: formatDateOnly(r.valid_to)
    }));
  }

  /**
   * Recupera la tariffa mensa attiva alla data di riferimento
   * @param {string} referenceDate - Data formato YYYY-MM-DD (default oggi)
   */
  async findActiveTariff(referenceDate = new Date().toISOString().split('T')[0]) {
    const query = `
      SELECT id, price, valid_from, valid_to, notes, created_at, updated_at
      FROM meal_tariffs
      WHERE valid_from <= $1 AND valid_to >= $1
      ORDER BY valid_from DESC
      LIMIT 1
    `;
    const result = await db.query(query, [referenceDate]);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      price: Number(r.price),
      valid_from: formatDateOnly(r.valid_from),
      valid_to: formatDateOnly(r.valid_to)
    };
  }

  /**
   * Aggiorna una singola voce storica della tariffa mensa
   */
  async updateTariff(tariffId, { price, valid_from, valid_to, notes }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(Number(price));
    }
    if (valid_from !== undefined) {
      fields.push(`valid_from = $${idx++}`);
      values.push(valid_from);
    }
    if (valid_to !== undefined) {
      fields.push(`valid_to = $${idx++}`);
      values.push(valid_to);
    }
    if (notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(notes);
    }

    if (fields.length === 0) {
      const res = await db.query('SELECT * FROM meal_tariffs WHERE id = $1', [tariffId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        price: Number(r.price),
        valid_from: formatDateOnly(r.valid_from),
        valid_to: formatDateOnly(r.valid_to)
      };
    }

    fields.push(`updated_at = NOW()`);
    values.push(tariffId);

    const query = `
      UPDATE meal_tariffs
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      price: Number(r.price),
      valid_from: formatDateOnly(r.valid_from),
      valid_to: formatDateOnly(r.valid_to)
    };
  }

  /**
   * Esegue transizione tariffa mensa: chiude validità della vecchia tariffa e crea la nuova
   */
  async transitionTariff({
    oldTariffId,
    oldTariffValidTo,
    newPrice,
    newTariffValidFrom,
    newTariffValidTo = '9999-01-01',
    notes = null
  }) {
    const client = await db.getClient ? await db.getClient() : null;
    const runner = client || db;

    try {
      if (client) await client.query('BEGIN');

      let updatedOldTariff = null;
      if (oldTariffId) {
        const oldRes = await runner.query(
          `UPDATE meal_tariffs
           SET valid_to = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [oldTariffValidTo, oldTariffId]
        );
        if (oldRes.rows[0]) {
          updatedOldTariff = {
            ...oldRes.rows[0],
            price: Number(oldRes.rows[0].price),
            valid_from: formatDateOnly(oldRes.rows[0].valid_from),
            valid_to: formatDateOnly(oldRes.rows[0].valid_to)
          };
        }
      }

      const newRes = await runner.query(
        `INSERT INTO meal_tariffs (price, valid_from, valid_to, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [Number(newPrice), newTariffValidFrom, newTariffValidTo, notes]
      );

      if (client) await client.query('COMMIT');

      const nr = newRes.rows[0];
      return {
        oldTariff: updatedOldTariff,
        newTariff: {
          ...nr,
          price: Number(nr.price),
          valid_from: formatDateOnly(nr.valid_from),
          valid_to: formatDateOnly(nr.valid_to)
        }
      };
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Risolve in memoria la tariffa mensa valida per una specifica data YYYY-MM-DD
   * (l'elenco tariffs è atteso ordinato per valid_from DESC)
   */
  resolveTariffForDate(tariffs, dateStr, fallbackPrice = 5.50) {
    const target = formatDateOnly(dateStr);
    if (!target || !Array.isArray(tariffs) || tariffs.length === 0) {
      return fallbackPrice;
    }
    const match = tariffs.find(t => {
      const from = formatDateOnly(t.valid_from);
      const to = formatDateOnly(t.valid_to);
      return from <= target && to >= target;
    });
    return match ? Number(match.price) : fallbackPrice;
  }
}

module.exports = new MealTariffRepository();
