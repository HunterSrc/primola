import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/attendance_repository.dart';

class AttendanceRecord {
  final String studentId;
  final String studentName;
  bool isPresent;
  bool isJustified;
  bool hasMeal;
  bool isExtra;
  final bool alreadyRegistered;

  AttendanceRecord({
    required this.studentId,
    required this.studentName,
    this.isPresent = false,
    this.isJustified = false,
    this.hasMeal = false,
    this.isExtra = false,
    this.alreadyRegistered = false,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final firstName = json['first_name'] as String? ?? '';
    final lastName = json['last_name'] as String? ?? '';
    return AttendanceRecord(
      studentId: json['student_id']?.toString() ?? '',
      studentName: '$firstName $lastName'.trim(),
      isPresent: json['is_present'] as bool? ?? false,
      isJustified: json['is_absent_justified'] as bool? ?? false,
      hasMeal: json['canteen_used'] as bool? ?? false,
      isExtra: json['is_extra'] as bool? ?? false,
      alreadyRegistered: json['already_registered'] as bool? ?? false,
    );
  }

  AttendanceRecord copyWith({bool? isPresent, bool? isJustified, bool? hasMeal, bool? isExtra}) {
    return AttendanceRecord(
      studentId: studentId,
      studentName: studentName,
      isPresent: isPresent ?? this.isPresent,
      isJustified: isJustified ?? this.isJustified,
      hasMeal: hasMeal ?? this.hasMeal,
      isExtra: isExtra ?? this.isExtra,
      alreadyRegistered: alreadyRegistered,
    );
  }
  
  Map<String, dynamic> toJson(String date) => {
    'student_id': studentId,
    'date': date,
    'is_present': isPresent,
    'is_absent_justified': isJustified,
    'canteen_used': hasMeal,
    'is_extra': isExtra,
  };
}

class AttendanceNotifier extends StateNotifier<AsyncValue<List<AttendanceRecord>>> {
  final Ref ref;

  AttendanceNotifier(this.ref) : super(const AsyncValue.loading()) {
    fetchExpected();
  }

  Future<void> fetchExpected() async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(attendanceRepositoryProvider);
      final today = DateTime.now().toIso8601String().split('T').first;
      final data = await repo.fetchExpected(today);
      state = AsyncValue.data(data);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void togglePresence(String studentId, bool value) {
    if (state.value == null) return;
    state = AsyncValue.data([
      for (final record in state.value!)
        if (record.studentId == studentId)
          // Se segno presente, rimuovo giustifica
          record.copyWith(isPresent: value, isJustified: value ? false : record.isJustified)
        else
          record
    ]);
  }

  void toggleJustified(String studentId, bool value) {
    if (state.value == null) return;
    state = AsyncValue.data([
      for (final record in state.value!)
        if (record.studentId == studentId)
          // Giustificato implica assente
          record.copyWith(isJustified: value, isPresent: value ? false : record.isPresent)
        else
          record
    ]);
  }

  void toggleMeal(String studentId, bool value) {
    if (state.value == null) return;
    state = AsyncValue.data([
      for (final record in state.value!)
        if (record.studentId == studentId)
          record.copyWith(hasMeal: value)
        else
          record
    ]);
  }

  void addExtraStudent(AttendanceRecord student) {
    if (state.value == null) return;
    if (state.value!.any((r) => r.studentId == student.studentId)) return;
    state = AsyncValue.data([
      ...state.value!,
      student.copyWith(isPresent: true, isExtra: true),
    ]);
  }

  Future<void> saveBulk() async {
    if (state.value == null) return;
    final currentRecords = state.value!;
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(attendanceRepositoryProvider);
      final today = DateTime.now().toIso8601String().split('T').first;
      final bulkPayload = currentRecords.map((r) => r.toJson(today)).toList();
      await repo.saveBulk(bulkPayload);
      // Ricarica per consistenza
      await fetchExpected();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AsyncValue<List<AttendanceRecord>>>((ref) {
  return AttendanceNotifier(ref);
});
