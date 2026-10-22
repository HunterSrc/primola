import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/attendance_provider.dart';
import '../repositories/student_repository.dart';

class DashboardPresenzeScreen extends ConsumerWidget {
  const DashboardPresenzeScreen({super.key});

  void _showAddExtraBottomSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const _AddExtraSheet(),
    );
  }

  void _handleSave(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(attendanceProvider.notifier).saveBulk();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Presenze salvate con successo!', style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Errore: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceState = ref.watch(attendanceProvider);
    final today = DateTime.now();
    final giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    final mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    final dateLabel = '${giorni[today.weekday - 1]} ${today.day} ${mesi[today.month - 1]} ${today.year}';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Segna Presenze'),
            Text(dateLabel, style: GoogleFonts.outfit(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: OutlinedButton.icon(
              icon: const Icon(Icons.person_add, color: Colors.white),
              label: const Text('Extra', style: TextStyle(color: Colors.white)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white54)),
              onPressed: () => _showAddExtraBottomSheet(context, ref),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: FilledButton.icon(
              icon: const Icon(Icons.save_rounded),
              label: const Text('Salva'),
              style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF1E3A8A)),
              onPressed: () => _handleSave(context, ref),
            ),
          ),
        ],
      ),
      body: attendanceState.when(
        data: (records) {
          if (records.isEmpty) {
            return _EmptyState(onRefresh: () => ref.read(attendanceProvider.notifier).fetchExpected());
          }

          final presentCount = records.where((r) => r.isPresent).length;

          return Column(
            children: [
              // Barra riepilogo presenze
              _PresenceBar(present: presentCount, total: records.length),
              // Lista studenti
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 820),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      itemCount: records.length,
                      itemBuilder: (context, index) {
                        final record = records[index];
                        return _AttendanceCard(
                          record: record,
                          onTogglePresence: (val) => ref.read(attendanceProvider.notifier).togglePresence(record.studentId, val),
                          onToggleJustified: (val) => ref.read(attendanceProvider.notifier).toggleJustified(record.studentId, val),
                          onToggleMeal: (val) => ref.read(attendanceProvider.notifier).toggleMeal(record.studentId, val),
                          onRemoveExtra: record.isExtra
                              ? () => ref.read(attendanceProvider.notifier).removeExtraStudent(record.studentId)
                              : null,
                        );
                      },
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Impossibile caricare i dati', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text('$err', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 24),
              FilledButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Riprova'),
                onPressed: () => ref.read(attendanceProvider.notifier).fetchExpected(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Barra riepilogo ───────────────────────────────────────────────────────────
class _PresenceBar extends StatelessWidget {
  final int present;
  final int total;
  const _PresenceBar({required this.present, required this.total});

  @override
  Widget build(BuildContext context) {
    final absent = total - present;
    final ratio = total > 0 ? present / total : 0.0;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _MiniStat(label: 'Totale attesi', value: '$total', color: const Color(0xFF1E3A8A)),
              const SizedBox(width: 16),
              _MiniStat(label: 'Presenti', value: '$present', color: const Color(0xFF16A34A)),
              const SizedBox(width: 16),
              _MiniStat(label: 'Assenti', value: '$absent', color: const Color(0xFFDC2626)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: Colors.grey.shade200,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF16A34A)),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${(ratio * 100).toStringAsFixed(0)}% presenti oggi',
            style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _MiniStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

// ─── Card singolo studente ─────────────────────────────────────────────────────
class _AttendanceCard extends StatelessWidget {
  final AttendanceRecord record;
  final ValueChanged<bool> onTogglePresence;
  final ValueChanged<bool> onToggleJustified;
  final ValueChanged<bool> onToggleMeal;
  final VoidCallback? onRemoveExtra;

  const _AttendanceCard({
    required this.record,
    required this.onTogglePresence,
    required this.onToggleJustified,
    required this.onToggleMeal,
    this.onRemoveExtra,
  });

  Color get _statusColor {
    if (record.isPresent) return const Color(0xFF16A34A);
    if (record.isJustified) return const Color(0xFFF59E0B);
    return const Color(0xFFDC2626);
  }

  String get _initials {
    final parts = record.studentName.split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return record.studentName.isNotEmpty ? record.studentName[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _statusColor.withValues(alpha: 0.35),
          width: 1.5,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Avatar con iniziali
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  _initials,
                  style: TextStyle(color: _statusColor, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Nome studente
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(record.studentName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  if (record.isExtra)
                    Container(
                      margin: const EdgeInsets.only(top: 3),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)),
                      child: const Text('EXTRA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber)),
                    ),
                ],
              ),
            ),
            // Presente
            _CheckToggle(
              label: 'Presente',
              value: record.isPresent,
              activeColor: const Color(0xFF16A34A),
              icon: Icons.check_circle_outline,
              activeIcon: Icons.check_circle,
              onChanged: onTogglePresence,
            ),
            const SizedBox(width: 8),
            // Giustifica
            _CheckToggle(
              label: 'Giustifica',
              value: record.isJustified,
              activeColor: const Color(0xFFF59E0B),
              icon: Icons.info_outline,
              activeIcon: Icons.info,
              onChanged: onToggleJustified,
            ),
            const SizedBox(width: 8),
            // Mensa
            _CheckToggle(
              label: 'Mensa',
              value: record.hasMeal,
              activeColor: const Color(0xFF3B82F6),
              icon: Icons.restaurant_outlined,
              activeIcon: Icons.restaurant,
              onChanged: onToggleMeal,
            ),
            if (record.isExtra && onRemoveExtra != null) ...[
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 22),
                tooltip: 'Rimuovi extra',
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Text('Rimuovere studente extra?'),
                      content: Text('Vuoi davvero rimuovere ${record.studentName} dall\'elenco di oggi?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Annulla'),
                        ),
                        FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: Colors.red),
                          onPressed: () {
                            Navigator.pop(ctx);
                            onRemoveExtra!();
                          },
                          child: const Text('Rimuovi'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckToggle extends StatelessWidget {
  final String label;
  final bool value;
  final Color activeColor;
  final IconData icon;
  final IconData activeIcon;
  final ValueChanged<bool> onChanged;

  const _CheckToggle({
    required this.label,
    required this.value,
    required this.activeColor,
    required this.icon,
    required this.activeIcon,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: value ? activeColor.withValues(alpha: 0.1) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: value ? activeColor : Colors.grey.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(value ? activeIcon : icon, size: 18, color: value ? activeColor : Colors.grey),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: value ? activeColor : Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

// ─── Empty state ───────────────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyState({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1E3A8A).withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.event_available, size: 72, color: Color(0xFF1E3A8A)),
          ),
          const SizedBox(height: 24),
          Text('Nessuno studente previsto oggi', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Non ci sono iscritti per questa giornata.', style: TextStyle(color: Colors.grey.shade600, fontSize: 15)),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            icon: const Icon(Icons.refresh),
            label: const Text('Aggiorna'),
            onPressed: onRefresh,
          ),
        ],
      ),
    );
  }
}

// ─── Bottom sheet Extra ────────────────────────────────────────────────────────
class _AddExtraSheet extends ConsumerStatefulWidget {
  const _AddExtraSheet();

  @override
  ConsumerState<_AddExtraSheet> createState() => _AddExtraSheetState();
}

class _AddExtraSheetState extends ConsumerState<_AddExtraSheet> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(studentListProvider);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)),
                ),
              ),
              const SizedBox(height: 20),
              Text('Aggiungi Studente Extra', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Cerca per nome o cognome...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade100,
                ),
                onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: studentsAsync.when(
                  data: (students) {
                    final filtered = students.where((s) => s.fullName.toLowerCase().contains(_searchQuery)).toList();
                    if (filtered.isEmpty) {
                      return const Center(child: Text('Nessuno studente trovato.'));
                    }
                    return ListView.separated(
                      controller: scrollController,
                      itemCount: filtered.length,
                      separatorBuilder: (context, index) => Divider(color: Colors.grey.shade100),
                      itemBuilder: (context, index) {
                        final student = filtered[index];
                        final initials = student.fullName.split(' ').take(2).map((e) => e[0].toUpperCase()).join();
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: const Color(0xFF1E3A8A).withValues(alpha: 0.12),
                            child: Text(initials, style: const TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold)),
                          ),
                          title: Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          trailing: FilledButton.icon(
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Aggiungi'),
                            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
                            onPressed: () {
                              ref.read(attendanceProvider.notifier).addExtraStudent(
                                AttendanceRecord(studentId: student.id, studentName: student.fullName),
                              );
                              Navigator.pop(context);
                            },
                          ),
                        );
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Errore: $e')),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
