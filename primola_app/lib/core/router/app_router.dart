import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/dashboard/screens/dashboard_presenze_screen.dart';
import '../../features/anagrafica/screens/anagrafica_form_screen.dart';
import '../../features/admin/screens/admin_dashboard_screen.dart';
import '../widgets/main_layout.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      if (!authState.isAuthenticated) return isLoggingIn ? null : '/login';
      if (isLoggingIn) return '/dashboard';
      if (state.matchedLocation.startsWith('/admin') && authState.role != 'ADMIN') return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => Scaffold(
          backgroundColor: Theme.of(context).colorScheme.surface,
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.spa, size: 64, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(height: 24),
                      Text('Primola', style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary)),
                      const SizedBox(height: 8),
                      Text('Accesso Area Riservata', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600)),
                      const SizedBox(height: 48),
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: FilledButton.icon(
                          icon: const Icon(Icons.admin_panel_settings),
                          label: const Text('Entra come ADMIN'),
                          onPressed: () {
                            ref.read(authStateProvider.notifier).login();
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return MainLayout(child: child);
        },
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => CustomTransitionPage(
              key: state.pageKey,
              child: const DashboardPresenzeScreen(),
              transitionsBuilder: (context, anim, secAnim, child) => FadeTransition(opacity: anim, child: child),
            ),
          ),
          GoRoute(
            path: '/anagrafica',
            pageBuilder: (context, state) => CustomTransitionPage(
              key: state.pageKey,
              child: const AnagraficaScreen(),
              transitionsBuilder: (context, anim, secAnim, child) => FadeTransition(opacity: anim, child: child),
            ),
          ),
          GoRoute(
            path: '/admin/dashboard',
            pageBuilder: (context, state) => CustomTransitionPage(
              key: state.pageKey,
              child: const AdminDashboardScreen(),
              transitionsBuilder: (context, anim, secAnim, child) => FadeTransition(opacity: anim, child: child),
            ),
          ),
        ],
      ),
    ],
  );
});
