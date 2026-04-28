class Tutor {
  final String id;
  final String fullName;
  final String? phone;

  Tutor({
    required this.id,
    required this.fullName,
    this.phone,
  });

  factory Tutor.fromJson(Map<String, dynamic> json) {
    return Tutor(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName'] as String? ?? 'Sconosciuto',
      phone: json['phone'] as String?,
    );
  }
}

class Student {
  final String id;
  final String firstName;
  final String lastName;
  final Tutor? mainTutor;

  Student({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.mainTutor,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    // Il backend ritorna sia chiavi snake_case (GET /students) sia camelCase
    final firstName = json['student_first_name'] as String? 
        ?? json['firstName'] as String? 
        ?? json['first_name'] as String? 
        ?? '';
    final lastName = json['student_last_name'] as String? 
        ?? json['lastName'] as String? 
        ?? json['last_name'] as String? 
        ?? '';
    return Student(
      id: (json['student_id'] ?? json['id'])?.toString() ?? '',
      firstName: firstName,
      lastName: lastName,
      mainTutor: json['mainTutor'] != null 
          ? Tutor.fromJson(json['mainTutor'] as Map<String, dynamic>) 
          : null,
    );
  }

  String get fullName => '$firstName $lastName';
}
