import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';

// Attendance
import 'package:mobile/screens/attendance/attendance_list_page.dart';
import 'package:mobile/screens/attendance/attendance_details_page.dart';
import 'package:mobile/screens/attendance/face_attendance_page.dart';
import 'package:mobile/screens/attendance/missing_checkout_page.dart';
import 'package:mobile/screens/bank/bank_and_topup_page.dart';

import 'package:mobile/screens/change_password.dart';
import 'package:mobile/screens/dispatches/dispatch_edit_page.dart';

// Core
import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/screens/notifaications/notification_list_page.dart';
import 'package:mobile/screens/profile_page.dart';
import 'package:mobile/widgets/custom_layout.dart';

// Documents (Dispatches)
import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';

// Notifications

// Projects
import 'package:mobile/screens/leave_requests/leave_request_page.dart';

// Funds
import 'package:mobile/screens/fund/fund_create_page.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/fund/fund_list_page.dart';
import 'package:mobile/screens/fund/fund_update_page.dart';

Route<dynamic> generateRoute(RouteSettings settings) {
  final name = settings.name;
  print("Route: $name");

  // -------------------------
  // 1) Dynamic routes
  // -------------------------
  if (name != null) {
    // 1) EDIT: /management/documents/:id/edit
    final editMatch = RegExp(r'^/management/documents/(\d+)/edit$').firstMatch(name);
    if (editMatch != null) {
      final id = int.parse(editMatch.group(1)!);
      return _buildPage(
        allowRoles: ["ADMIN", "SECRETARY"],
        child: DispatchEditPage(documentId: id),
      );
    }

    // 2) DETAIL: /management/documents/:id
    final detailMatch = RegExp(r'^/management/documents/(\d+)$').firstMatch(name);
    if (detailMatch != null) {
      final id = int.parse(detailMatch.group(1)!);
      return _buildPage(
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
        child: DispatchDetailPage(id: id),
      );
    }

    // /document/:id (redirect từ notification)
    if (name.startsWith("/document/")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY",
          ],
          child: DispatchDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID document không hợp lệ");
      }
    }

    // /attendance/detail/:id
    if (name.startsWith("/attendance/detail/")) {
      final idStr = name.substring("/attendance/detail/".length);
      final id = int.tryParse(idStr);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD",
          ],
          child: AttendanceDetailPage(attendanceId: id),
        );
      } else {
        return _errorPage("Lỗi: ID attendance không hợp lệ");
      }
    }

    // /accountant/funds/:id (detail)
    if (name.startsWith("/accountant/funds/") && !name.endsWith("/edit")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: ["ADMIN", "ACCOUNTANT"],
          child: FundDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID quỹ không hợp lệ");
      }
    }

    // /accountant/funds/:id/edit
    if (name.startsWith("/accountant/funds/") && name.endsWith("/edit")) {
      final parts = name.split("/");
      final id = parts.length >= 4 ? int.tryParse(parts[3]) : null;
      if (id != null) {
        return _buildPage(
          allowRoles: ["ADMIN", "ACCOUNTANT"],
          child: FundUpdatePage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID quỹ không hợp lệ (edit)");
      }
    }


  }

  // -------------------------
  // 2) Static routes
  // -------------------------
  switch (name) {
    case "/":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HR", "HOD", "EMPLOYEE","SECRETARY"
          ],
          child: CustomLayout(child: HomePage()),
        ),
      );

    // Attendance
    case "/attendance/list":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD","SECRETARY"
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
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD","SECRETARY"
          ],
          child: CustomLayout(child: AttendanceDetailPage(attendanceId: id)),
        ),
      );

    case "/attendance":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD","SECRETARY"
          ],
          child: CustomLayout(child: CheckInCheckOutPage()),
        ),
      );

    case "/attendance/missing-checkout":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: ["HR", "ADMIN"], // mở rộng nếu cần
          child: CustomLayout(child: MissingCheckoutPage()),
        ),
      );

    // Documents
    case "/management/documents":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: ["ADMIN","MANAGER","PM","SECRETARY","ACCOUNTANT","HOD"],
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

    // Notifications
    case "/notifications":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN","MANAGER","PM","ACCOUNTANT","HR","HOD","EMPLOYEE","SECRETARY"
          ],
          child: CustomLayout(child: NotificationListPage()),
        ),
      );

    // Leave requests
    case "/utilities/leave-request":
      return _buildPage(
        allowRoles: [
          "ADMIN","MANAGER","PM","HOD","EMPLOYEE","HR","ACCOUNTANT","SECRETARY"
        ],
        child: const LeaveRequestPage(),
      );

    // Funds
    case "/accountant/funds":
      return _buildPage(
        allowRoles: ["ADMIN", "ACCOUNTANT"],
        child: FundListPage(),
      );

    case "/accountant/funds/create":
      return _buildPage(
        allowRoles: ["ADMIN", "ACCOUNTANT"],
        child: FundCreatePage(),
      );

    // Bank
    // case "/accountant/bank-topup":
    //   return _buildPage(
    //     allowRoles: ["ADMIN","ACCOUNTANT","CHIEFACCOUNTANT","CHIEF_ACCOUNTANT"],
    //     child: const BankAndTopupPage(isAccountant: true),
    //   );

    // Auth
    case "/login":
      return MaterialPageRoute(builder: (_) => const LoginPage());

    case "/change-password":
      return MaterialPageRoute(
        builder: (_) => const CustomLayout(child: ChangePasswordPage()),
      );

    case "/profile":
      return MaterialPageRoute(
        builder: (_) => const CustomLayout(child: ProfilePage()),
      );

    case "/logout":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "ADMIN","MANAGER","PM","ACCOUNTANT","HR","HOD","EMPLOYEE","SECRETARY"
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

// -------------------------
// Helpers
// -------------------------
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
