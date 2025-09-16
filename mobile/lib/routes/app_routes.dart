import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';

// Attendance
import 'package:mobile/screens/attendance/attendance_list_page.dart';
import 'package:mobile/screens/attendance/attendance_details_page.dart';
import 'package:mobile/screens/attendance/face_attendance_page.dart';
import 'package:mobile/screens/bank/bank_and_topup_page.dart';

import 'package:mobile/screens/change_password.dart';

// Core
import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/screens/profile_page.dart';
import 'package:mobile/widgets/custom_layout.dart';

// Documents (Dispatches)
import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';

// Notifications
import 'package:mobile/screens/notifications/notification_list_page.dart';

// Projects
import 'package:mobile/screens/projects/project_list_page.dart'; 
import 'package:mobile/screens/leave_requests/leave_request_page.dart';

// Funds
import 'package:mobile/screens/fund/fund_create_page.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/fund/fund_list_page.dart';
import 'package:mobile/screens/fund/fund_update_page.dart';
<<<<<<< Updated upstream
=======
import 'package:mobile/screens/projects/project_detail_page.dart';
import 'package:mobile/models/project_model.dart';
import 'package:mobile/screens/salaries/salary_detail_page.dart';
import 'package:mobile/screens/salaries/salary_summary_page.dart';

import 'package:mobile/screens/transaction/transaction_approve_page.dart';
>>>>>>> Stashed changes

Route<dynamic> generateRoute(RouteSettings settings) {
  final name = settings.name ?? '/';
  debugPrint("Route: $name");

<<<<<<< Updated upstream
  // -------------------------
  // 1) Dynamic routes
  // -------------------------
  if (name != null) {
    // /management/documents/:id
    if (name.startsWith("/management/documents/")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: [
            "ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY",
          ],
          child: DispatchDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID công văn không hợp lệ");
      }
=======
  // Parse as URI to make matching easier
  final uri = Uri.parse(name);

  // -------------------------
  // 1) Dynamic routes first
  // -------------------------

  // /management/documents/:id
  if (name.startsWith("/management/documents/")) {
    final id = int.tryParse(name.split("/").last);
    if (id != null) {
      return _buildPage(
        settings,
        child: DispatchDetailPage(id: id),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
      );
    } else {
      return _errorPage(settings, "Lỗi: ID công văn không hợp lệ");
>>>>>>> Stashed changes
    }
  }

<<<<<<< Updated upstream
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
=======
  // /document/:id (redirect từ notification)
  if (name.startsWith("/document/")) {
    final id = int.tryParse(name.split("/").last);
    if (id != null) {
      return _buildPage(
        settings,
        child: DispatchDetailPage(id: id),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
      );
    } else {
      return _errorPage(settings, "Lỗi: ID document không hợp lệ");
>>>>>>> Stashed changes
    }
  }

<<<<<<< Updated upstream
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
=======
  // /accountant/funds/:id (detail)
  if (name.startsWith("/accountant/funds/") && !name.endsWith("/edit")) {
    final id = int.tryParse(name.split("/").last);
    if (id != null) {
      return _buildPage(
        settings,
        child: FundDetailPage(id: id),
        allowRoles: ["ADMIN", "ACCOUNTANT"],
      );
    } else {
      return _errorPage(settings, "Lỗi: ID quỹ không hợp lệ");
>>>>>>> Stashed changes
    }
  }

<<<<<<< Updated upstream
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
            "ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HR", "HOD", "EMPLOYEE",
          ],
          child: CustomLayout(child: HomePage()),
        ),
      );

    // Attendance
    case "/attendance/list":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD",
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
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD",
          ],
          child: CustomLayout(child: AttendanceDetailPage(attendanceId: id)),
        ),
      );

    case "/attendance":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: [
            "EMPLOYEE", "MANAGER", "PM", "HR", "ADMIN", "ACCOUNTANT", "HOD",
          ],
          child: CustomLayout(child: CheckInCheckOutPage()),
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
            "ADMIN","MANAGER","PM","ACCOUNTANT","HR","HOD","EMPLOYEE",
          ],
          child: CustomLayout(child: NotificationListPage()),
        ),
      );

    // Leave requests
    case "/utilities/leave-request":
      return _buildPage(
        allowRoles: [
          "ADMIN","MANAGER","PM","HOD","EMPLOYEE","HR","ACCOUNTANT",
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
    case "/accountant/bank-topup":
      return _buildPage(
        allowRoles: ["ADMIN","ACCOUNTANT","CHIEFACCOUNTANT","CHIEF_ACCOUNTANT"],
        child: const BankAndTopupPage(isAccountant: true),
      );

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
            "ADMIN","MANAGER","PM","ACCOUNTANT","HR","HOD","EMPLOYEE",
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
=======
  // /accountant/funds/:id/edit (update)
  if (name.startsWith("/accountant/funds/") && name.endsWith("/edit")) {
    final parts = name.split("/");
    // .../funds/{id}/edit  -> id at index length-2
    final id = parts.length >= 4 ? int.tryParse(parts[parts.length - 2]) : null;
    if (id != null) {
      return _buildPage(
        settings,
        child: FundUpdatePage(id: id),
        allowRoles: ["ADMIN", "ACCOUNTANT"],
      );
    } else {
      return _errorPage(settings, "Lỗi: ID quỹ không hợp lệ");
    }
  }

  // /salaries/:id (detail)
  if (name.startsWith("/salaries/") && name != "/salaries/summary") {
    final id = int.tryParse(name.split("/").last);
    if (id != null) {
      return _buildPage(
        settings,
        child: SalaryDetailPage(salaryId: id),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD"],
      );
    } else {
      return _errorPage(settings, "Lỗi: ID lương không hợp lệ");
    }
  }

  // --------------------------------
  // 2) Static (exact) route matches
  // --------------------------------
  switch (uri.path) {
    case '/':
      return _buildPage(
        settings,
        child: HomePage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY","EMPLOYEE"],
      );

    case '/login':
      return MaterialPageRoute(
        settings: settings,
        builder: (_) => const LoginPage(),
      );

    case '/logout':
      return MaterialPageRoute(
        settings: settings,
        builder: (_) => const LogoutPage(),
      );

    case '/dispatches':
      return _buildPage(
        settings,
        child: const DispatchesListPage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
      );

    case '/dispatches/create':
      return _buildPage(
        settings,
        child: const DispatchCreatePage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "HOD", "SECRETARY"],
      );

    case '/notifications':
      return _buildPage(
        settings,
        child: const NotificationListPage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
      );

    case '/projects':
      return _buildPage(
        settings,
        child: const ProjectListPage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD","EMPLOYEE"],
      );
case '/projects/detail':
  return _buildPage(
    settings,
    child: ProjectDetailPage(
      project: settings.arguments as ProjectModel, // nhận model từ list
    ),
    allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD","EMPLOYEE"], // giữ giống /projects
  );
    case '/accountant/funds':
      return _buildPage(
        settings,
        child: const FundListPage(),
        allowRoles: ["ADMIN", "ACCOUNTANT"],
      );

    case '/accountant/funds/create':
      return _buildPage(
        settings,
        child: const FundCreatePage(),
        allowRoles: ["ADMIN", "ACCOUNTANT"],
      );

    case '/salaries/summary':
      return _buildPage(
        settings,
        child: const SalarySummaryPage(),
        allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD"],
      );

    case '/transactions/approve':
      return _buildPage(
        settings,
        child: const TransactionApprovePage(),
        allowRoles: ["ADMIN", "ACCOUNTANT"],
      );

    default:
      return _errorPage(settings, "Không tìm thấy trang: ${uri.path}");
  }
}

/// Wraps pages with RoleGuard and your CustomLayout.
/// Adjust RoleGuard’s constructor if your signature differs.
MaterialPageRoute _buildPage(
  RouteSettings settings, {
  required Widget child,
  required List<String> allowRoles,
}) {
  return MaterialPageRoute(
    settings: settings,
>>>>>>> Stashed changes
    builder: (_) => RoleGuard(
      allowRoles: allowRoles,
      child: CustomLayout(child: child),
    ),
  );
}

<<<<<<< Updated upstream
MaterialPageRoute _errorPage(String message) {
  return MaterialPageRoute(
    builder: (_) => Scaffold(body: Center(child: Text(message))),
=======
/// Simple fallback error page
MaterialPageRoute _errorPage(RouteSettings settings, String message) {
  return MaterialPageRoute(
    settings: settings,
    builder: (_) => Scaffold(
      appBar: AppBar(title: const Text("Lỗi")),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(message, textAlign: TextAlign.center),
        ),
      ),
    ),
>>>>>>> Stashed changes
  );
}
