import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';
import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/widgets/custom_layout.dart';

Route<dynamic> generateRoute(RouteSettings settings) {
  switch (settings.name) {
    case "/":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "ACCOUNTANT",
            "HR",
            "HOD",
            "EMPLOYEE",
          ],
          child: CustomLayout(child: HomePage()),
        ),
      );
    case "/login":
      return MaterialPageRoute(builder: (_) => const LoginPage());
    case "/logout":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "ACCOUNTANT",
            "HR",
            "HOD",
            "EMPLOYEE",
          ],
          child: CustomLayout(child: LogoutPage()),
        ),
      );
    default:
      return MaterialPageRoute(
        builder: (_) =>
            const Scaffold(body: Center(child: Text("404 - Not found"))),
      );
  }
}
