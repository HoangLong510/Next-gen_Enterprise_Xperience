import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';
import 'package:mobile/screens/attendance/attendance_list_page.dart';
import 'package:mobile/screens/attendance/face_attendance_page.dart';
import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/widgets/custom_layout.dart';
import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';
import 'package:mobile/screens/notifaications/notification_list_page.dart';
import 'package:mobile/screens/attendance/attendance_details_page.dart';

Route<dynamic> generateRoute(RouteSettings settings) {
  final name = settings.name;
  // --- 1. Xử lý dynamic route trước ---
  if (name != null) {
    // /management/documents/:id
    if (name.startsWith("/management/documents/")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "ACCOUNTANT",
            "HOD",
            "SECRETARY",
          ],
          child: DispatchDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID công văn không hợp lệ");
      }
    }

    // /document/:id (redirect từ notification)
    if (name.startsWith("/document/")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "ACCOUNTANT",
            "HOD",
            "SECRETARY",
          ],
          child: DispatchDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID document không hợp lệ");
      }
    }

    // TODO: /project/:id nếu sau này có
    // if (name.startsWith("/project/")) { ... }

    // /attendance/detail/:id
    if (name.startsWith("/attendance/detail/")) {
      final idStr = name.substring("/attendance/detail/".length);
      final id = int.tryParse(idStr);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "EMPLOYEE",
            "MANAGER",
            "PM",
            "HR",
            "ADMIN",
            "ACCOUNTANT",
            "HOD",
          ],
          child: AttendanceDetailPage(attendanceId: id),
        );
      } else {
        return _errorPage("Lỗi: ID attendance không hợp lệ");
      }
    }
  }

  switch (name) {
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

    case "/attendance/list":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE",
            "MANAGER",
            "PM",
            "HR",
            "ADMIN",
            "ACCOUNTANT",
            "HOD",
          ],
          child: CustomLayout(child: AttendanceListPage()),
        ),
      );

    case "/attendance/detail":
      final id = settings.arguments as int?;
      if (id == null) return _errorPage("Thiếu attendanceId");
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE",
            "MANAGER",
            "PM",
            "HR",
            "ADMIN",
            "ACCOUNTANT",
            "HOD",
          ],
          child: CustomLayout(child: AttendanceDetailPage(attendanceId: id)),
        ),
      );

    case "/attendance":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE",
            "MANAGER",
            "PM",
            "HR",
            "ADMIN",
            "ACCOUNTANT",
            "HOD",
          ],
          child: CustomLayout(child: CheckInCheckOutPage()),
        ),
      );

    case "/management/documents":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "SECRETARY",
            "ACCOUNTANT",
            "HOD",
          ],
          child: CustomLayout(child: DispatchesListPage()),
        ),
      );

    case "/management/documents/create":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: ["ADMIN", "SECRETARY"],
          child: CustomLayout(child: DispatchCreatePage()),
        ),
      );

    case "/notifications":
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
          child: CustomLayout(child: NotificationListPage()),
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

// --- Helper ---
MaterialPageRoute _buildPage({
  required List<String> allowRoles,
  required Widget child,
}) {
  return MaterialPageRoute(
    builder: (_) => RoleGuard(
      allowRoles: allowRoles,
      child: CustomLayout(child: child),
    ),
  );
}

MaterialPageRoute _errorPage(String message) {
  return MaterialPageRoute(
    builder: (_) => Scaffold(body: Center(child: Text(message))),
  );
}
