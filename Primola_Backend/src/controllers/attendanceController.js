const attendanceRepository = require('../repositories/attendanceRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

exports.getExpected = async (req, res, next) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, "Parametro 'date' mancante o formato non valido (richiesto YYYY-MM-DD).");
  }

  try {
    const expectedStudents = await attendanceRepository.getExpectedStudents(date);
    return sendSuccess(res, 200, expectedStudents);
  } catch (error) {
    next(error);
  }
};

const { getUserGroups } = require('../middlewares/authMiddleware');

exports.bulkUpsert = async (req, res, next) => {
  const attendances = req.body;

  if (!Array.isArray(attendances) || attendances.length === 0) {
    return sendError(res, 400, "Il body deve essere un array non vuoto di presenze.");
  }

  try {
    const userGroups = getUserGroups(req.user);
    const isTeacherOnly = userGroups.length > 0 && !userGroups.includes('ADMIN') && !userGroups.includes('OFFICE') && userGroups.includes('TEACHER');

    let processedAttendances = attendances;

    // Se l'utente è solo TEACHER, non può modificare mensa o aggiungere studenti non autorizzati
    if (isTeacherOnly) {
      const dates = [...new Set(attendances.map(a => a.date).filter(Boolean))];
      let existingMap = new Map();
      for (const d of dates) {
        const existingRecords = await attendanceRepository.getExpectedStudents(d);
        for (const rec of existingRecords) {
          existingMap.set(`${rec.student_id}_${d}`, rec);
        }
      }

      // Solo gli studenti già registrati dall'ufficio/admin possono essere aggiornati dal teacher
      processedAttendances = attendances
        .filter(item => existingMap.has(`${item.student_id}_${item.date}`))
        .map(item => {
          const key = `${item.student_id}_${item.date}`;
          const existing = existingMap.get(key);
          return {
            ...item,
            // Preserva mensa stabilita da OFFICE/ADMIN
            canteen_used: existing ? !!existing.canteen_used : false
          };
        });
    }

    const result = await attendanceRepository.bulkUpsertAttendances(processedAttendances);
    return sendSuccess(res, 200, {
      message: `${result.length} presenze elaborate (inserite o aggiornate).`,
      records: result
    });
  } catch (error) {
    next(error);
  }
};
