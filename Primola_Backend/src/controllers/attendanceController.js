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

exports.bulkUpsert = async (req, res, next) => {
  const attendances = req.body;

  if (!Array.isArray(attendances) || attendances.length === 0) {
    return sendError(res, 400, "Il body deve essere un array non vuoto di presenze.");
  }

  try {
    const result = await attendanceRepository.bulkUpsertAttendances(attendances);
    return sendSuccess(res, 200, {
      message: `${result.length} presenze elaborate (inserite o aggiornate).`,
      records: result
    });
  } catch (error) {
    next(error);
  }
};
