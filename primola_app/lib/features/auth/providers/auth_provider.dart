import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:shared_preferences/shared_preferences.dart';

class AuthState {
  final bool isAuthenticated;
  final String? role; // Es. 'STAFF', 'ADMIN'
  
  AuthState({this.isAuthenticated = false, this.role});
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState()) {
    _checkToken();
  }

  Future<void> _checkToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token != null) {
      // In un caso reale decodifichiamo il JWT per leggere il ruolo
      state = AuthState(isAuthenticated: true, role: 'ADMIN');
    }
  }

  Future<void> login() async {
    final prefs = await SharedPreferences.getInstance();
    // Inseriamo il JWT hardcoded valido per bypassare il backend
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzc0MDM3MTgsImV4cCI6MTgwODk2MTMxOH0.DROen4mAK4EHaosPyA1tIu75e4ROOqGWO1pjkJ0VFk4';
    await prefs.setString('jwt_token', token);
    
    state = AuthState(isAuthenticated: true, role: 'ADMIN');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    state = AuthState(isAuthenticated: false, role: null);
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
