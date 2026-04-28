import 'student.dart';

class AttendanceStats {
  final int totalExpected;
  final int present;
  final int absent;
  final int excused;

  AttendanceStats({
    this.totalExpected = 0,
    this.present = 0,
    this.absent = 0,
    this.excused = 0,
  });

  factory AttendanceStats.fromJson(Map<String, dynamic> json) {
    return AttendanceStats(
      totalExpected: json['totalExpected'] as int? ?? 0,
      present: json['present'] as int? ?? 0,
      absent: json['absent'] as int? ?? 0,
      excused: json['excused'] as int? ?? 0,
    );
  }
}

class UnjustifiedAbsence {
  final String studentId;
  final String studentName;
  final Tutor? mainTutor;

  UnjustifiedAbsence({
    required this.studentId,
    required this.studentName,
    this.mainTutor,
  });

  factory UnjustifiedAbsence.fromJson(Map<String, dynamic> json) {
    return UnjustifiedAbsence(
      studentId: json['studentId']?.toString() ?? '',
      studentName: json['studentName'] as String? ?? '',
      mainTutor: json['mainTutor'] != null 
          ? Tutor.fromJson(json['mainTutor'] as Map<String, dynamic>) 
          : null,
    );
  }
}

class DailyReport {
  final AttendanceStats statistics;
  final List<UnjustifiedAbsence> unjustifiedAbsences;

  DailyReport({
    required this.statistics,
    required this.unjustifiedAbsences,
  });

  factory DailyReport.fromJson(Map<String, dynamic> json) {
    return DailyReport(
      statistics: json['statistics'] != null 
          ? AttendanceStats.fromJson(json['statistics'] as Map<String, dynamic>) 
          : AttendanceStats(),
      unjustifiedAbsences: (json['unjustifiedAbsences'] as List<dynamic>?)
              ?.map((e) => UnjustifiedAbsence.fromJson(e as Map<String, dynamic>))
              .toList() ?? 
          [],
    );
  }
}
