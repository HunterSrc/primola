import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../dashboard/repositories/student_repository.dart';

class AnagraficaScreen extends ConsumerStatefulWidget {
  const AnagraficaScreen({super.key});

  @override
  ConsumerState<AnagraficaScreen> createState() => _AnagraficaScreenState();
}

class _AnagraficaScreenState extends ConsumerState<AnagraficaScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Anagrafica'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.person_add_alt_1), text: 'Nuovo Studente'),
            Tab(icon: Icon(Icons.people_alt), text: 'Lista Iscritti'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _NewStudentForm(),
          _StudentListTab(),
        ],
      ),
    );
  }
}

// ─── Nuovo Studente Form ───────────────────────────────────────────────────────
class _NewStudentForm extends ConsumerStatefulWidget {
  const _NewStudentForm();

  @override
  ConsumerState<_NewStudentForm> createState() => _NewStudentFormState();
}

class _NewStudentFormState extends ConsumerState<_NewStudentForm> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _scuolaController = TextEditingController();
  final _luogoNascitaController = TextEditingController();
  DateTime? _dataNascita;

  bool _subLuned = false;
  bool _subMarted = false;
  bool _subMercoled = false;
  bool _subGioved = false;
  bool _subVenerd = false;
  bool _isSaving = false;

  final List<Map<String, TextEditingController>> _tutors = [];

  @override
  void initState() {
    super.initState();
    _addTutor();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _scuolaController.dispose();
    _luogoNascitaController.dispose();
    super.dispose();
  }

  void _addTutor() {
    setState(() {
      _tutors.add({'name': TextEditingController(), 'phone': TextEditingController()});
    });
  }

  void _removeTutor(int index) {
    if (_tutors.length > 1) setState(() => _tutors.removeAt(index));
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2015),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      helpText: 'Seleziona data di nascita',
    );
    if (picked != null) setState(() => _dataNascita = picked);
  }

  Future<void> _saveForm() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dataNascita == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleziona la data di nascita'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final List<int> giorni = [];
      if (_subLuned) giorni.add(1);
      if (_subMarted) giorni.add(2);
      if (_subMercoled) giorni.add(3);
      if (_subGioved) giorni.add(4);
      if (_subVenerd) giorni.add(5);

      final studentData = {
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'data_nascita': _dataNascita!.toIso8601String().split('T').first,
        'luogo_nascita': _luogoNascitaController.text.trim(),
        'residenza': 'N/D',
        'scuola': _scuolaController.text.trim(),
        'giorni_abbonamento': giorni,
      };

      final tutorsList = _tutors.map((t) {
        final parts = t['name']!.text.trim().split(' ');
        return {
          'first_name': parts.first,
          'last_name': parts.length > 1 ? parts.sublist(1).join(' ') : '',
          'phone': t['phone']!.text.trim(),
        };
      }).toList();

      await ref.read(studentRepositoryProvider).createStudent(studentData, tutorsList);

      // Invalida la cache della lista studenti
      ref.invalidate(studentListProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Text('${_firstNameController.text} ${_lastNameController.text} aggiunto!', style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
        _resetForm();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Errore: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _resetForm() {
    _firstNameController.clear();
    _lastNameController.clear();
    _scuolaController.clear();
    _luogoNascitaController.clear();
    setState(() {
      _dataNascita = null;
      _subLuned = false; _subMarted = false; _subMercoled = false;
      _subGioved = false; _subVenerd = false;
      _tutors.clear();
    });
    _addTutor();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Sezione Dati Personali ────────────────────────────────────
                _SectionHeader(icon: Icons.person, label: 'Dati Personali'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _firstNameController,
                        decoration: const InputDecoration(labelText: 'Nome *', prefixIcon: Icon(Icons.badge_outlined)),
                        validator: (v) => v == null || v.isEmpty ? 'Obbligatorio' : null,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _lastNameController,
                        decoration: const InputDecoration(labelText: 'Cognome *', prefixIcon: Icon(Icons.badge_outlined)),
                        validator: (v) => v == null || v.isEmpty ? 'Obbligatorio' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: _pickDate,
                        borderRadius: BorderRadius.circular(12),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: 'Data di Nascita *',
                            prefixIcon: const Icon(Icons.cake_outlined),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(
                            _dataNascita == null
                                ? 'Seleziona data'
                                : '${_dataNascita!.day.toString().padLeft(2, '0')}/${_dataNascita!.month.toString().padLeft(2, '0')}/${_dataNascita!.year}',
                            style: TextStyle(color: _dataNascita == null ? Colors.grey : Colors.black87),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _luogoNascitaController,
                        decoration: const InputDecoration(labelText: 'Luogo di Nascita *', prefixIcon: Icon(Icons.location_city_outlined)),
                        validator: (v) => v == null || v.isEmpty ? 'Obbligatorio' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _scuolaController,
                  decoration: const InputDecoration(labelText: 'Scuola *', prefixIcon: Icon(Icons.school_outlined)),
                  validator: (v) => v == null || v.isEmpty ? 'Obbligatorio' : null,
                ),

                // ── Sezione Giorni Frequenza ──────────────────────────────────
                const SizedBox(height: 32),
                _SectionHeader(icon: Icons.calendar_month, label: 'Giorni di Frequenza'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10.0,
                  children: [
                    FilterChip(label: const Text('Lunedì'), selected: _subLuned, onSelected: (v) => setState(() => _subLuned = v)),
                    FilterChip(label: const Text('Martedì'), selected: _subMarted, onSelected: (v) => setState(() => _subMarted = v)),
                    FilterChip(label: const Text('Mercoledì'), selected: _subMercoled, onSelected: (v) => setState(() => _subMercoled = v)),
                    FilterChip(label: const Text('Giovedì'), selected: _subGioved, onSelected: (v) => setState(() => _subGioved = v)),
                    FilterChip(label: const Text('Venerdì'), selected: _subVenerd, onSelected: (v) => setState(() => _subVenerd = v)),
                  ],
                ),

                // ── Sezione Tutor ──────────────────────────────────────────────
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _SectionHeader(icon: Icons.people_outline, label: 'Contatti Tutor'),
                    TextButton.icon(
                      icon: const Icon(Icons.add),
                      label: const Text('Aggiungi'),
                      onPressed: _addTutor,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ..._tutors.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final tutor = entry.value;
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            backgroundColor: const Color(0xFF1E3A8A).withValues(alpha: 0.1),
                            child: Text('${idx + 1}', style: const TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              children: [
                                TextFormField(
                                  controller: tutor['name'],
                                  decoration: InputDecoration(
                                    labelText: idx == 0 ? 'Nome e Cognome Tutor Principale *' : 'Nome e Cognome Tutor',
                                    prefixIcon: const Icon(Icons.person_outline),
                                  ),
                                  validator: (v) => idx == 0 && (v == null || v.isEmpty) ? 'Il contatto principale è obbligatorio' : null,
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: tutor['phone'],
                                  keyboardType: TextInputType.phone,
                                  decoration: const InputDecoration(labelText: 'Telefono', prefixIcon: Icon(Icons.phone_outlined)),
                                ),
                              ],
                            ),
                          ),
                          if (idx > 0) ...[
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.red),
                              tooltip: 'Rimuovi tutor',
                              onPressed: () => _removeTutor(idx),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),

                // ── Salva ──────────────────────────────────────────────────────
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: FilledButton.icon(
                    icon: _isSaving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save_rounded),
                    label: Text(_isSaving ? 'Salvataggio...' : 'Salva Anagrafica', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                    onPressed: _isSaving ? null : _saveForm,
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Lista iscritti ────────────────────────────────────────────────────────────
class _StudentListTab extends ConsumerWidget {
  const _StudentListTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentListProvider);

    return studentsAsync.when(
      data: (students) {
        if (students.isEmpty) {
          return const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.people_outline, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('Nessuno studente iscritto', style: TextStyle(fontSize: 18, color: Colors.grey)),
              ],
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: students.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final s = students[index];
            final initials = s.fullName.split(' ').take(2).map((e) => e.isNotEmpty ? e[0].toUpperCase() : '').join();
            return Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: const Color(0xFF1E3A8A).withValues(alpha: 0.12),
                    radius: 24,
                    child: Text(initials, style: const TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                        Text('ID: ${s.id.substring(0, 8)}...', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text('Errore: $e', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Riprova'),
              onPressed: () => ref.invalidate(studentListProvider),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Widget helper ─────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionHeader({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary, size: 22),
        const SizedBox(width: 8),
        Text(label, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
      ],
    );
  }
}
