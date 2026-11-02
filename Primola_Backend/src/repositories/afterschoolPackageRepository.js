const db = require('../config/database');

class AfterschoolPackageRepository {
  /**
   * Recupera tutti i pacchetti con la tariffa attiva alla data di riferimento
   * @param {string} referenceDate - Data formato YYYY-MM-DD (default oggi)
   */
  async findAllWithActiveTariff(referenceDate = new Date().toISOString().split('T')[0]) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.code,
        p.monthly_days,
        p.days_per_week,
        p.is_active,
        p.sort_order,
        p.created_at,
        p.updated_at,
        t.id AS current_tariff_id,
        t.price AS current_price,
        t.valid_from AS current_valid_from,
        t.valid_to AS current_valid_to,
        t.notes AS current_notes
      FROM afterschool_packages p
      LEFT JOIN afterschool_tariffs t 
        ON t.package_id = p.id
       AND t.valid_from <= $1
       AND t.valid_to >= $1
      ORDER BY p.sort_order ASC, p.name ASC
    `;
    const result = await db.query(query, [referenceDate]);
    return result.rows;
  }

  /**
   * Recupera un pacchetto per ID
   */
  async findById(id) {
    const query = `
      SELECT id, name, code, monthly_days, days_per_week, is_active, sort_order, created_at, updated_at
      FROM afterschool_packages
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Recupera lo storico di tutte le tariffe di un pacchetto
   */
  async getTariffsByPackageId(packageId) {
    const query = `
      SELECT id, package_id, price, valid_from, valid_to, notes, created_at, updated_at
      FROM afterschool_tariffs
      WHERE package_id = $1
      ORDER BY valid_from DESC, valid_to DESC
    `;
    const result = await db.query(query, [packageId]);
    return result.rows;
  }

  /**
   * Crea un nuovo pacchetto con la tariffa iniziale
   */
  async createPackageWithTariff({
    name,
    code = null,
    monthly_days = 4,
    days_per_week = null,
    is_active = true,
    sort_order = 0,
    price,
    valid_from,
    valid_to = '9999-01-01',
    notes = null
  }) {
    const client = await db.getClient ? await db.getClient() : null;
    const runner = client || db;

    try {
      if (client) await client.query('BEGIN');

      const pkgRes = await runner.query(
        `INSERT INTO afterschool_packages (name, code, monthly_days, days_per_week, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, code, Number(monthly_days), days_per_week ? Number(days_per_week) : null, is_active, Number(sort_order)]
      );

      const newPackage = pkgRes.rows[0];

      const tariffRes = await runner.query(
        `INSERT INTO afterschool_tariffs (package_id, price, valid_from, valid_to, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newPackage.id, Number(price), valid_from, valid_to, notes]
      );

      if (client) await client.query('COMMIT');

      return {
        ...newPackage,
        current_tariff_id: tariffRes.rows[0].id,
        current_price: tariffRes.rows[0].price,
        current_valid_from: tariffRes.rows[0].valid_from,
        current_valid_to: tariffRes.rows[0].valid_to,
        current_notes: tariffRes.rows[0].notes
      };
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Aggiorna i dati base di un pacchetto
   */
  async updatePackage(id, { name, code, monthly_days, days_per_week, is_active, sort_order }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(code);
    }
    if (monthly_days !== undefined) {
      fields.push(`monthly_days = $${idx++}`);
      values.push(Number(monthly_days));
    }
    if (days_per_week !== undefined) {
      fields.push(`days_per_week = $${idx++}`);
      values.push(days_per_week ? Number(days_per_week) : null);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }
    if (sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(Number(sort_order));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE afterschool_packages
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Aggiorna una singola tariffa
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
      const res = await db.query('SELECT * FROM afterschool_tariffs WHERE id = $1', [tariffId]);
      return res.rows[0] || null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(tariffId);

    const query = `
      UPDATE afterschool_tariffs
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Esegue transizione tariffa: chiude validità della vecchia tariffa e crea la nuova
   */
  async transitionTariff(packageId, {
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

      // 1. Aggiorna vecchia tariffa chiudendola alla data specificata
      let updatedOldTariff = null;
      if (oldTariffId) {
        const oldRes = await runner.query(
          `UPDATE afterschool_tariffs
           SET valid_to = $1, updated_at = NOW()
           WHERE id = $2 AND package_id = $3
           RETURNING *`,
          [oldTariffValidTo, oldTariffId, packageId]
        );
        updatedOldTariff = oldRes.rows[0] || null;
      }

      // 2. Inserisce nuova tariffa
      const newRes = await runner.query(
        `INSERT INTO afterschool_tariffs (package_id, price, valid_from, valid_to, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [packageId, Number(newPrice), newTariffValidFrom, newTariffValidTo, notes]
      );

      if (client) await client.query('COMMIT');

      return {
        oldTariff: updatedOldTariff,
        newTariff: newRes.rows[0]
      };
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) client.release();
    }
  }
}

module.exports = new AfterschoolPackageRepository();
