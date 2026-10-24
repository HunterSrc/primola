const userRepository = require('../repositories/userRepository');
const projectRepository = require('../repositories/projectRepository');
const afterschoolRepository = require('../repositories/afterschoolRepository');
const groupRepository = require('../repositories/groupRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');
const { sanitizeTeacherSensitiveData } = require('../middlewares/authMiddleware');

/**
 * Controller per la gestione utenti e profilo
 */
class UserController {
  /**
   * GET /api/users
   * ADMIN & OFFICE: lista tutti gli utenti
   * TEACHER: lista ristretta solo a se stesso
   */
  async listUsers(req, res) {
    try {
      const userGroups = req.user.groups || [];
      const isPrivileged = userGroups.includes('ADMIN') || userGroups.includes('OFFICE');

      let users;
      if (isPrivileged) {
        users = await userRepository.findAll();
      } else {
        const self = await userRepository.findById(req.user.id);
        users = self ? [self] : [];
      }

      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        groups: u.groups,
        created_at: u.created_at,
        updated_at: u.updated_at
      }));

      return sendSuccess(res, 200, sanitizedUsers);
    } catch (error) {
      console.error('Errore in listUsers:', error);
      return sendError(res, 500, 'Errore nel recupero della lista utenti.');
    }
  }

  /**
   * GET /api/users/:id
   * ADMIN & OFFICE: qualsiasi utente
   * TEACHER: solo se stesso, con esclusione di dati sensibili di costo
   */
  async getUser(req, res) {
    try {
      const { id } = req.params;
      const userGroups = req.user.groups || [];
      const isPrivileged = userGroups.includes('ADMIN') || userGroups.includes('OFFICE');

      if (!isPrivileged && req.user.id !== id) {
        return sendError(res, 403, 'Accesso non consentito al profilo di un altro utente.');
      }

      const user = await userRepository.findById(id);
      if (!user) {
        return sendError(res, 404, 'Utente non trovato.');
      }

      // Recupera le commesse assegnate
      let assignedProjects = await projectRepository.getProjectsByUser(id);

      // Se l'utente richiedente è solo TEACHER, maschera compensi e ore
      assignedProjects = sanitizeTeacherSensitiveData(req, assignedProjects);

      let afterschoolAssignment = null;
      if (isPrivileged) {
        afterschoolAssignment = await afterschoolRepository.findByUserId(id);
      }

      return sendSuccess(res, 200, {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        groups: user.groups,
        created_at: user.created_at,
        updated_at: user.updated_at,
        projects: assignedProjects,
        afterschool_assignment: afterschoolAssignment
      });
    } catch (error) {
      console.error('Errore in getUser:', error);
      return sendError(res, 500, 'Errore nel recupero del dettaglio utente.');
    }
  }

  /**
   * POST /api/users
   * Creazione nuovo utente.
   * ADMIN: può assegnare qualsiasi gruppo
   * OFFICE: può creare utenti ma i gruppi sono forzati a ['TEACHER'] (o rifiutati se tenta di assegnare ADMIN/OFFICE)
   * TEACHER: vietato (403)
   */
  async createUser(req, res) {
    try {
      const userGroups = req.user.groups || [];
      const isAdmin = userGroups.includes('ADMIN');
      const isOffice = userGroups.includes('OFFICE');

      if (!isAdmin && !isOffice) {
        return sendError(res, 403, 'Non hai i permessi per creare nuovi utenti.');
      }

      const { email, password, first_name, last_name, phone, groups } = req.body;

      if (!email) {
        return sendError(res, 400, 'Il campo email è obbligatorio.');
      }
      if (!password) {
        return sendError(res, 400, 'La password è obbligatoria per i nuovi utenti.');
      }

      // Controllo permessi modifica gruppi
      let targetGroups = ['TEACHER'];
      if (groups && Array.isArray(groups)) {
        if (!isAdmin) {
          return sendError(res, 403, 'Solo gli amministratori possono assegnare gruppi/ruoli agli utenti.');
        }
        targetGroups = groups;
      }

      const existing = await userRepository.findByEmail(email);
      if (existing) {
        return sendError(res, 409, 'Un utente con questa email esiste già.');
      }

      const newUser = await userRepository.create({
        email,
        password,
        first_name,
        last_name,
        phone,
        groups: targetGroups
      });

      return sendSuccess(res, 201, newUser);
    } catch (error) {
      console.error('Errore in createUser:', error);
      return sendError(res, 500, 'Errore durante la creazione dell\'utente.');
    }
  }

  /**
   * PUT /api/users/:id
   * Aggiornamento utente
   * ADMIN: tutto compresi gruppi
   * OFFICE: anagrafica di chiunque, ma non i gruppi
   * TEACHER: solo se stesso e solo anagrafica (first_name, last_name, phone, email)
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userGroups = req.user.groups || [];
      const isAdmin = userGroups.includes('ADMIN');
      const isOffice = userGroups.includes('OFFICE');

      const isSelf = req.user.id === id;

      if (!isAdmin && !isOffice && !isSelf) {
        return sendError(res, 403, 'Accesso negato alla modifica di questo utente.');
      }

      const { email, password, first_name, last_name, phone, groups } = req.body;

      // Se l'utente tenta di modificare i gruppi e non è ADMIN
      if (groups !== undefined && !isAdmin) {
        return sendError(res, 403, 'Solo gli amministratori possono modificare i gruppi degli utenti.');
      }

      const updatedUser = await userRepository.update(
        id,
        { email, password, first_name, last_name, phone, groups },
        isAdmin
      );

      if (!updatedUser) {
        return sendError(res, 404, 'Utente non trovato.');
      }

      return sendSuccess(res, 200, {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        phone: updatedUser.phone,
        groups: updatedUser.groups,
        updated_at: updatedUser.updated_at
      });
    } catch (error) {
      console.error('Errore in updateUser:', error);
      return sendError(res, 500, 'Errore durante l\'aggiornamento dell\'utente.');
    }
  }

  /**
   * DELETE /api/users/:id
   * Solo ADMIN
   */
  async deleteUser(req, res) {
    try {
      const userGroups = req.user.groups || [];
      if (!userGroups.includes('ADMIN')) {
        return sendError(res, 403, 'Solo gli amministratori possono eliminare utenti.');
      }

      const { id } = req.params;
      if (req.user.id === id) {
        return sendError(res, 400, 'Non è possibile eliminare il proprio account amministratore.');
      }

      const deleted = await userRepository.delete(id);
      if (!deleted) {
        return sendError(res, 404, 'Utente non trovato.');
      }

      return sendSuccess(res, 200, { message: 'Utente eliminato con successo.' });
    } catch (error) {
      console.error('Errore in deleteUser:', error);
      return sendError(res, 500, 'Errore durante l\'eliminazione dell\'utente.');
    }
  }

  /**
   * GET /api/users/groups
   * Ritorna tutti i gruppi disponibili
   */
  async listGroups(req, res) {
    try {
      const groups = await groupRepository.findAll();
      return sendSuccess(res, 200, groups);
    } catch (error) {
      console.error('Errore in listGroups:', error);
      return sendError(res, 500, 'Errore nel recupero della lista gruppi.');
    }
  }
}

module.exports = new UserController();
