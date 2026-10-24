const afterschoolRepository = require('../repositories/afterschoolRepository');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

/**
 * Controller per la commessa speciale dopo scuola.
 * Accessibile SOLO ad ADMIN e OFFICE (protetto da RBAC e middleware).
 */
class AfterschoolController {
  /**
   * GET /api/afterschool/assignments
   * Lista tutti i docenti assegnati al doposcuola con la relativa tariffa
   */
  async listAssignments(req, res) {
    try {
      const assignments = await afterschoolRepository.findAll();
      return sendSuccess(res, 200, assignments);
    } catch (error) {
      console.error('Errore in listAssignments dopo scuola:', error);
      return sendError(res, 500, 'Errore nel recupero delle assegnazioni dopo scuola.');
    }
  }

  /**
   * GET /api/afterschool/assignments/:userId
   * Dettaglio assegnazione doposcuola di un singolo docente
   */
  async getAssignmentByUser(req, res) {
    try {
      const { userId } = req.params;
      const assignment = await afterschoolRepository.findByUserId(userId);
      return sendSuccess(res, 200, assignment || null);
    } catch (error) {
      console.error('Errore in getAssignmentByUser dopo scuola:', error);
      return sendError(res, 500, 'Errore nel recupero dell\'assegnazione dopo scuola.');
    }
  }

  /**
   * POST /api/afterschool/assignments
   * Assegna o aggiorna la commessa dopo scuola per un docente
   * Payload: { user_id, hourly_rate, notes }
   */
  async assignAfterschool(req, res) {
    try {
      const { user_id, hourly_rate, notes } = req.body;

      if (!user_id) {
        return sendError(res, 400, 'user_id obbligatorio per l\'assegnazione del doposcuola.');
      }

      if (hourly_rate === undefined || hourly_rate === null || isNaN(Number(hourly_rate)) || Number(hourly_rate) < 0) {
        return sendError(res, 400, 'Tariffa oraria non valida o non specificata.');
      }

      const user = await userRepository.findById(user_id);
      if (!user) {
        return sendError(res, 404, 'Utente docente non trovato.');
      }

      // Verifica che l'utente abbia il ruolo TEACHER
      const userGroups = user.groups || [];
      if (!userGroups.includes('TEACHER')) {
        return sendError(res, 400, 'La commessa dopo scuola può essere assegnata esclusivamente a utenti di tipo TEACHER.');
      }

      const assignment = await afterschoolRepository.upsert(user_id, Number(hourly_rate), notes);
      return sendSuccess(res, 200, assignment);
    } catch (error) {
      console.error('Errore in assignAfterschool:', error);
      return sendError(res, 500, 'Errore nell\'assegnazione della commessa dopo scuola.');
    }
  }

  /**
   * DELETE /api/afterschool/assignments/:userId
   * Rimuove la commessa dopo scuola da un docente
   */
  async removeAssignment(req, res) {
    try {
      const { userId } = req.params;
      const deleted = await afterschoolRepository.deleteByUserId(userId);
      if (!deleted) {
        return sendError(res, 404, 'Nessuna assegnazione dopo scuola trovata per questo docente.');
      }

      return sendSuccess(res, 200, { message: 'Assegnazione dopo scuola rimossa con successo.' });
    } catch (error) {
      console.error('Errore in removeAssignment dopo scuola:', error);
      return sendError(res, 500, 'Errore nella rimozione dell\'assegnazione dopo scuola.');
    }
  }

  /**
   * GET /api/afterschool/week-summary?startDate=YYYY-MM-DD
   * Accessibile a ADMIN, OFFICE e TEACHER.
   * Restituisce la settimana lavorativa Lun-Ven con turni dei teacher e studenti attesi + mensa.
   */
  async getWeekSummary(req, res) {
    try {
      const { startDate } = req.query;
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return sendError(res, 400, "Parametro 'startDate' mancante o non valido (YYYY-MM-DD).");
      }

      // Calcola il lunedì della settimana
      const d = new Date(startDate + 'T00:00:00Z');
      const dayOfWeek = d.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sab
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + diffToMonday);

      const days = [];
      const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

      for (let i = 0; i < 5; i++) {
        const cur = new Date(monday);
        cur.setUTCDate(monday.getUTCDate() + i);
        const dateStr = cur.toISOString().split('T')[0];
        days.push({
          date: dateStr,
          day_name: dayNames[i],
          shifts: [],
          students: [],
          total_teacher_hours: 0,
          expected_students_count: 0,
          meals_count: 0
        });
      }

      const weekStartStr = days[0].date;
      const weekEndStr = days[4].date;

      // 1. Recupera turni docenti per l'intervallo
      const shifts = await afterschoolRepository.findShiftsBetween(weekStartStr, weekEndStr);

      // Recupera chiusure straordinarie dell'intervallo
      const closures = await afterschoolRepository.findClosuresBetween(weekStartStr, weekEndStr);
      const closuresByDate = {};
      for (const c of closures) {
        const cDate = typeof c.date === 'string' ? c.date.split('T')[0] : new Date(c.date).toISOString().split('T')[0];
        closuresByDate[cDate] = c;
      }

      // Mappa turni per data
      const shiftsByDate = {};
      for (const s of shifts) {
        const sDate = typeof s.shift_date === 'string' ? s.shift_date.split('T')[0] : new Date(s.shift_date).toISOString().split('T')[0];
        if (!shiftsByDate[sDate]) shiftsByDate[sDate] = [];
        
        // Calcola durata in ore
        let hours = 0;
        if (s.start_time && s.end_time) {
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          hours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
        }

        shiftsByDate[sDate].push({
          id: s.id,
          user_id: s.user_id,
          shift_date: sDate,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          start_time: s.start_time ? s.start_time.substring(0, 5) : '',
          end_time: s.end_time ? s.end_time.substring(0, 5) : '',
          hours: Number(hours.toFixed(2)),
          notes: s.notes || ''
        });
      }


      // 2. Per ciascun giorno recupera studenti previsti e chiusure
      for (const day of days) {
        day.closure = closuresByDate[day.date] || null;
        day.shifts = shiftsByDate[day.date] || [];
        day.total_teacher_hours = Number(day.shifts.reduce((acc, sh) => acc + (sh.hours || 0), 0).toFixed(2));

        const students = await afterschoolRepository.getStudentsForDate(day.date);
        day.students = students.map(st => ({
          student_id: st.student_id,
          first_name: st.first_name,
          last_name: st.last_name,
          school: st.scuola || '',
          is_present: !!st.is_present,
          has_meal: !!st.canteen_used || !!st.has_meal_plan,
          canteen_used: !!st.canteen_used,
          already_registered: !!st.already_registered
        }));

        day.expected_students_count = day.students.length;
        day.meals_count = day.students.filter(st => st.has_meal).length;
      }

      return sendSuccess(res, 200, {
        week_start: weekStartStr,
        week_end: weekEndStr,
        days
      });
    } catch (error) {
      console.error('Errore in getWeekSummary doposcuola:', error);
      return sendError(res, 500, 'Errore nel recupero della vista settimanale doposcuola.');
    }
  }


  /**
   * POST /api/afterschool/shifts
   * Solo ADMIN e OFFICE
   */
  async createShift(req, res) {
    try {
      const { user_id, shift_date, start_time, end_time, notes } = req.body;

      if (!user_id || !shift_date || !start_time || !end_time) {
        return sendError(res, 400, 'Campi obbligatori: user_id, shift_date, start_time, end_time.');
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
        return sendError(res, 400, 'Formato shift_date non valido (richiesto YYYY-MM-DD).');
      }

      if (start_time >= end_time) {
        return sendError(res, 400, "L'orario di inizio deve essere precedente all'orario di fine.");
      }

      const user = await userRepository.findById(user_id);
      if (!user) {
        return sendError(res, 404, 'Docente/utente non trovato.');
      }

      const shift = await afterschoolRepository.createShift(user_id, shift_date, start_time, end_time, notes);
      const fullShift = await afterschoolRepository.findShiftById(shift.id);

      return sendSuccess(res, 201, fullShift || shift);
    } catch (error) {
      console.error('Errore in createShift doposcuola:', error);
      return sendError(res, 500, 'Errore durante la creazione del turno insegnante.');
    }
  }

  /**
   * PUT /api/afterschool/shifts/:id
   * Solo ADMIN e OFFICE
   */
  async updateShift(req, res) {
    try {
      const { id } = req.params;
      const { user_id, shift_date, start_time, end_time, notes } = req.body;

      if (start_time && end_time && start_time >= end_time) {
        return sendError(res, 400, "L'orario di inizio deve essere precedente all'orario di fine.");
      }

      const updated = await afterschoolRepository.updateShift(id, user_id, shift_date, start_time, end_time, notes);
      if (!updated) {
        return sendError(res, 404, 'Turno non trovato.');
      }

      const fullShift = await afterschoolRepository.findShiftById(updated.id);
      return sendSuccess(res, 200, fullShift || updated);
    } catch (error) {
      console.error('Errore in updateShift doposcuola:', error);
      return sendError(res, 500, 'Errore durante l\'aggiornamento del turno insegnante.');
    }
  }

  /**
   * DELETE /api/afterschool/shifts/:id
   * Solo ADMIN e OFFICE
   */
  async deleteShift(req, res) {
    try {
      const { id } = req.params;
      const deleted = await afterschoolRepository.deleteShift(id);
      if (!deleted) {
        return sendError(res, 404, 'Turno non trovato.');
      }

      return sendSuccess(res, 200, { message: 'Turno eliminato con successo.' });
    } catch (error) {
      console.error('Errore in deleteShift doposcuola:', error);
      return sendError(res, 500, 'Errore durante l\'eliminazione del turno insegnante.');
    }
  }

  /**
   * GET /api/afterschool/closures
   * Lista tutte le date di chiusura (accessibile a tutti gli autenticati o Admin/Office)
   */
  async listClosures(req, res) {
    try {
      const closures = await afterschoolRepository.findAllClosures();
      return sendSuccess(res, 200, closures);
    } catch (error) {
      console.error('Errore in listClosures doposcuola:', error);
      return sendError(res, 500, 'Errore nel recupero delle date di chiusura.');
    }
  }

  /**
   * POST /api/afterschool/closures
   * Solo ADMIN
   */
  async createClosure(req, res) {
    try {
      const { date, title, notes } = req.body;

      if (!date || !title) {
        return sendError(res, 400, 'Data e titolo sono obbligatori.');
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendError(res, 400, 'Formato date non valido (richiesto YYYY-MM-DD).');
      }

      const closure = await afterschoolRepository.upsertClosure(date, title.trim(), notes ? notes.trim() : null);
      return sendSuccess(res, 201, closure);
    } catch (error) {
      console.error('Errore in createClosure doposcuola:', error);
      return sendError(res, 500, 'Errore durante il salvataggio della data di chiusura.');
    }
  }

  /**
   * DELETE /api/afterschool/closures/:id
   * Solo ADMIN
   */
  async deleteClosure(req, res) {
    try {
      const { id } = req.params;
      const deleted = await afterschoolRepository.deleteClosure(id);
      if (!deleted) {
        return sendError(res, 404, 'Data di chiusura non trovata.');
      }

      return sendSuccess(res, 200, { message: 'Data di chiusura rimossa con successo.' });
    } catch (error) {
      console.error('Errore in deleteClosure doposcuola:', error);
      return sendError(res, 500, 'Errore durante la rimozione della data di chiusura.');
    }
  }
}

module.exports = new AfterschoolController();


