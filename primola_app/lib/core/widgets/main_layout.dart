import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';

class MainLayout extends ConsumerWidget {
  final Widget child;

  const MainLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = GoRouterState.of(context);
    final String location = router.matchedLocation;

    int selectedIndex = 0;
    if (location.startsWith('/dashboard')) {
      selectedIndex = 0;
    } else if (location.startsWith('/anagrafica')) {
      selectedIndex = 1;
    } else if (location.startsWith('/admin')) {
      selectedIndex = 2;
    }

    return Scaffold(
      body: Row(
        children: [
          // Navigation Rail visibile su tablet e desktop
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: (index) {
              if (index == 0) context.go('/dashboard');
              if (index == 1) context.go('/anagrafica');
              if (index == 2) context.go('/admin/dashboard');
            },
            labelType: NavigationRailLabelType.all,
            backgroundColor: Theme.of(context).colorScheme.surface,
            selectedIconTheme: IconThemeData(color: Theme.of(context).colorScheme.primary),
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.assignment_outlined),
                selectedIcon: Icon(Icons.assignment),
                label: Text('Presenze'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.person_add_outlined),
                selectedIcon: Icon(Icons.person_add),
                label: Text('Anagrafica'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.bar_chart_outlined),
                selectedIcon: Icon(Icons.bar_chart),
                label: Text('Report'),
              ),
            ],
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: IconButton(
                    icon: const Icon(Icons.logout, color: Colors.redAccent),
                    tooltip: 'Logout',
                    onPressed: () {
                      ref.read(authStateProvider.notifier).logout();
                    },
                  ),
                ),
              ),
            ),
          ),
          const VerticalDivider(thickness: 1, width: 1),
          // Contenuto principale
          Expanded(child: child),
        ],
      ),
    );
  }
}
