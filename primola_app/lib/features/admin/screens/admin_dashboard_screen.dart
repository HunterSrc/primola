import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/models/daily_report.dart';
import '../../../core/models/mensa_report.dart';
import '../repositories/report_repository.dart';

// Provider autoDispose → refetch ad ogni navigazione al tab Report
final dailyReportProvider = FutureProvider.autoDispose.family<DailyReport, String>((ref, date) async {
  return ref.watch(reportRepositoryProvider).fetchDailyReport(date);
});

// Tipo per il range mensa: (from, to)
typedef DateRange = ({String from, String to});

final mensaReportProvider = FutureProvider.autoDispose.family<MensaReport, DateRange>((ref, range) async {
  return ref.watch(reportRepositoryProvider).fetchMensaReport(range.from, range.to);
});

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  String _selectedDate = DateTime.now().toIso8601String().split('T').first;

  // Range mensa: default = mese corrente
  late String _mensaFrom;
  late String _mensaTo;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _mensaFrom = DateTime(now.year, now.month, 1).toIso8601String().split('T').first;
    _mensaTo = now.toIso8601String().split('T').first;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.parse(_selectedDate),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked.toIso8601String().split('T').first);
    }
  }

  Future<void> _pickMensaRange() async {
    final from = await showDatePicker(
      context: context,
      initialDate: DateTime.parse(_mensaFrom),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      helpText: 'Data inizio',
    );
    if (from == null || !mounted) return;
    final to = await showDatePicker(
      context: context,
      initialDate: DateTime.parse(_mensaTo),
      firstDate: from,
      lastDate: DateTime.now(),
      helpText: 'Data fine',
    );
    if (to != null) {
      setState(() {
        _mensaFrom = from.toIso8601String().split('T').first;
        _mensaTo = to.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _callTutor(String? phone) async {
    if (phone == null || phone.isEmpty) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nessun numero disponibile')));
      return;
    }
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Impossibile chiamare $phone')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportAsync = ref.watch(dailyReportProvider(_selectedDate));
    final mensaRange = (from: _mensaFrom, to: _mensaTo);
    final mensaAsync = ref.watch(mensaReportProvider(mensaRange));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Report & Statistiche'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.calendar_month, color: Colors.white),
            label: Text(_selectedDate, style: const TextStyle(color: Colors.white)),
            onPressed: _pickDate,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Sezione Giornaliera ─────────────────────────────────────────────
          _SectionTitle(icon: Icons.today, label: 'Presenze Giornaliere — $_selectedDate'),
          const SizedBox(height: 12),
          reportAsync.when(
            data: (report) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _StatCard('Attesi', report.statistics.totalExpected.toString(), const Color(0xFF1E3A8A), Icons.people),
                    _StatCard('Presenti', report.statistics.present.toString(), const Color(0xFF16A34A), Icons.check_circle),
                    _StatCard('Assenti', report.statistics.absent.toString(), const Color(0xFFDC2626), Icons.cancel),
                    _StatCard('Giustificati', report.statistics.excused.toString(), const Color(0xFFF59E0B), Icons.info),
                  ],
                ),
                const SizedBox(height: 28),
                _SectionTitle(icon: Icons.warning_amber, label: 'Assenze Ingiustificate'),
                const SizedBox(height: 12),
                if (report.unjustifiedAbsences.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16A34A).withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF16A34A).withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.check_circle, color: Color(0xFF16A34A)),
                        SizedBox(width: 12),
                        Text('Nessuna assenza ingiustificata per questa data.', style: TextStyle(fontWeight: FontWeight.w500)),
                      ],
                    ),
                  )
                else
                  ...report.unjustifiedAbsences.map((absence) {
                    final phone = absence.mainTutor?.phone;
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                      color: const Color(0xFFDC2626).withValues(alpha: 0.04),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFFDC2626).withValues(alpha: 0.12),
                          child: const Icon(Icons.warning, color: Color(0xFFDC2626)),
                        ),
                        title: Text(absence.studentName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Tutor: ${absence.mainTutor?.fullName ?? "N/D"}'),
                        trailing: FilledButton.icon(
                          icon: const Icon(Icons.phone, size: 18),
                          label: Text(phone ?? 'N/D'),
                          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                          onPressed: () => _callTutor(phone),
                        ),
                      ),
                    );
                  }),
              ],
            ),
            loading: () => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
            error: (e, _) => _ErrorBox(message: '$e'),
          ),

          // ── Sezione Mensa Mensile ───────────────────────────────────────────
          const SizedBox(height: 36),
          Row(
            children: [
              Expanded(child: _SectionTitle(icon: Icons.restaurant, label: 'Metriche Mensa')),
              OutlinedButton.icon(
                icon: const Icon(Icons.date_range, size: 18),
                label: Text('$_mensaFrom → $_mensaTo', style: const TextStyle(fontSize: 12)),
                onPressed: _pickMensaRange,
              ),
            ],
          ),
          const SizedBox(height: 12),
          mensaAsync.when(
            data: (mensa) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _StatCard('Pasti Totali', mensa.totalMensa.toString(), const Color(0xFF7C3AED), Icons.restaurant),
                    _StatCard('Regolari', mensa.expectedMensa.toString(), const Color(0xFF0891B2), Icons.people),
                    _StatCard('Extra Mensa', mensa.extraMensa.toString(), const Color(0xFFF59E0B), Icons.person_add),
                  ],
                ),
                if (mensa.dailyBreakdown.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('Dettaglio giornaliero', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
                    ),
                    child: Column(
                      children: mensa.dailyBreakdown.asMap().entries.map((e) {
                        final isLast = e.key == mensa.dailyBreakdown.length - 1;
                        final day = e.value;
                        return Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(day.date, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF7C3AED))),
                                  ),
                                  const Spacer(),
                                  _MiniChip(label: 'Tot: ${day.totalMensa}', color: const Color(0xFF7C3AED)),
                                  const SizedBox(width: 8),
                                  _MiniChip(label: 'Reg: ${day.regularMensa}', color: const Color(0xFF0891B2)),
                                  const SizedBox(width: 8),
                                  _MiniChip(label: 'Extra: ${day.extraMensa}', color: const Color(0xFFF59E0B)),
                                ],
                              ),
                            ),
                            if (!isLast) Divider(height: 1, color: Colors.grey.shade100),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 16),
                  const Center(child: Text('Nessun dato mensa nel periodo selezionato.', style: TextStyle(color: Colors.grey))),
                ]
              ],
            ),
            loading: () => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
            error: (e, _) => _ErrorBox(message: '$e'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

// ── Widget helpers ─────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionTitle({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(label, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold))),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _StatCard(this.label, this.value, this.color, this.icon);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        color: color.withValues(alpha: 0.05),
        elevation: 0,
        margin: const EdgeInsets.all(4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: color.withValues(alpha: 0.2), width: 1),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: color, size: 26),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final String label;
  final Color color;
  const _MiniChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;
  const _ErrorBox({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: const TextStyle(color: Colors.red))),
        ],
      ),
    );
  }
}
