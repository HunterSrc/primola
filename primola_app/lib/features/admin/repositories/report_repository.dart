import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_client_provider.dart';
import '../../../core/models/daily_report.dart';
import '../../../core/models/mensa_report.dart';

class ReportRepository {
  final ApiClient _apiClient;

  ReportRepository(this._apiClient);

  Future<DailyReport> fetchDailyReport(String date) async {
    return _apiClient.get<DailyReport>(
      '/reports/attendances',
      queryParameters: {'date': date},
      fromJsonT: (json) => DailyReport.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<MensaReport> fetchMensaReport(String from, String to) async {
    return _apiClient.get<MensaReport>(
      '/reports/mensa',
      queryParameters: {'from': from, 'to': to},
      fromJsonT: (json) => MensaReport.fromJson(json as Map<String, dynamic>),
    );
  }
}

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ReportRepository(apiClient);
});
