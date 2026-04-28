import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_client_provider.dart';
import '../../../core/models/student.dart';

class StudentRepository {
  final ApiClient _apiClient;

  StudentRepository(this._apiClient);

  Future<List<Student>> fetchStudents() async {
    // Il metodo helper `get` nel nostro ApiClient parsificherà la risposta,
    // estrarrà il blocco "data" e chiamerà il fromJsonT che gli passiamo.
    return _apiClient.get<List<Student>>(
      '/students',
      fromJsonT: (json) {
        if (json is List) {
          return json.map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
  }

  Future<void> createStudent(Map<String, dynamic> studentData, List<Map<String, dynamic>> tutorsList) async {
    await _apiClient.post(
      '/students',
      data: {
        'student': studentData,
        'tutors': tutorsList,
      },
      fromJsonT: (json) => null, // Non ci serve parsare la risposta per ora
    );
  }
}

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return StudentRepository(apiClient);
});

final studentListProvider = FutureProvider<List<Student>>((ref) async {
  return ref.watch(studentRepositoryProvider).fetchStudents();
});
