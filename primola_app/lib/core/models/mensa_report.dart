class MensaReport {
  final String from;
  final String to;
  final int totalMensa;
  final int expectedMensa;
  final int extraMensa;
  final List<MensaDailyBreakdown> dailyBreakdown;

  MensaReport({
    required this.from,
    required this.to,
    required this.totalMensa,
    required this.expectedMensa,
    required this.extraMensa,
    required this.dailyBreakdown,
  });

  factory MensaReport.fromJson(Map<String, dynamic> json) {
    return MensaReport(
      from: json['range']?['from'] as String? ?? '',
      to: json['range']?['to'] as String? ?? '',
      totalMensa: json['totalMensa'] as int? ?? 0,
      expectedMensa: json['expectedMensa'] as int? ?? 0,
      extraMensa: json['extraMensa'] as int? ?? 0,
      dailyBreakdown: (json['dailyBreakdown'] as List<dynamic>? ?? [])
          .map((e) => MensaDailyBreakdown.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class MensaDailyBreakdown {
  final String date;
  final int regularMensa;
  final int extraMensa;
  final int totalMensa;

  MensaDailyBreakdown({
    required this.date,
    required this.regularMensa,
    required this.extraMensa,
    required this.totalMensa,
  });

  factory MensaDailyBreakdown.fromJson(Map<String, dynamic> json) {
    // La data arriva come ISO string con timezone, prendiamo solo YYYY-MM-DD
    final rawDate = json['date'] as String? ?? '';
    final dateOnly = rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate;
    return MensaDailyBreakdown(
      date: dateOnly,
      regularMensa: json['regularMensa'] as int? ?? 0,
      extraMensa: json['extraMensa'] as int? ?? 0,
      totalMensa: json['totalMensa'] as int? ?? 0,
    );
  }
}
