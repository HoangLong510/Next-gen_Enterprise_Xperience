import 'package:flutter/material.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:provider/provider.dart';

class RoleGuard extends StatelessWidget {
  final List<String> allowRoles;
  final Widget child;

  const RoleGuard({super.key, required this.allowRoles, required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return FutureBuilder<Account?>(
      future: AuthService.fetchAccountDataApi(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasData) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!auth.isLoggedIn) {
              if (snapshot.data != null) {
                auth.setAccount(snapshot.data!);
              }
            }
          });

          if (allowRoles.contains(snapshot.data!.role)) {
            return child;
          } else {
            return const Scaffold(
              body: Center(child: Text("403 - Không có quyền")),
            );
          }
        }

        return const LoginPage();
      },
    );
  }
}
