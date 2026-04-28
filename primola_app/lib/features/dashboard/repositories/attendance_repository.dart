import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_client_provider.dart';
import '../providers/attendance_provider.dart';

class AttendanceRepository {
  final ApiClient _apiClient;

  AttendanceRepository(this._apiClient);

  Future<List<AttendanceRecord>> fetchExpected(String date) async {
    return _apiClient.get<List<AttendanceRecord>>(
      '/attendances/expected',
      queryParameters: {'date': date},
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
  }

  Future<void> saveBulk(List<Map<String, dynamic>> payload) async {
    try {
      final response = await _apiClient.dio.post(
        '/attendances/bulk',
        data: payload, // Il backend si aspetta un array diretto
      );
      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? 'Errore durante il salvataggio');
      }
    } catch (e) {
      rethrow;
    }
  }
}

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return AttendanceRepository(ref.watch(apiClientProvider));
});
