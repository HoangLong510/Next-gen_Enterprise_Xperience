import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';
import 'package:mobile/models/account.dart';

// Attendance
import 'package:mobile/screens/attendance/attendance_list_page.dart';
import 'package:mobile/screens/attendance/attendance_details_page.dart';

import 'package:mobile/screens/attendance/missing_checkout_page.dart';
import 'package:mobile/screens/attendance/face_attendance_page.dart' show CheckInCheckOutPage; // file này định nghĩa CheckInCheckOutPage

// Bank
import 'package:mobile/screens/bank/bank_and_topup_page.dart';

// Auth / Core
import 'package:mobile/screens/change_password.dart';

import 'package:mobile/screens/fund/cash_advance_list_page.dart';

import 'package:mobile/screens/dispatches/dispatch_edit_page.dart';


// Core

import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/screens/notifaications/notification_list_page.dart';
import 'package:mobile/screens/profile_page.dart';
import 'package:mobile/screens/transaction/transactions_page.dart';
import 'package:mobile/widgets/custom_layout.dart';

// Documents (Dispatches)
import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';

// Notifications

// Projects

import 'package:mobile/screens/projects/project_list_page.dart';


import 'package:mobile/screens/projects/project_list_page.dart';
import 'package:mobile/screens/projects/project_detail_page.dart';
import 'package:mobile/screens/projects/kanban_board_page.dart';
import 'package:mobile/models/project_model.dart';

// Leave Requests

import 'package:mobile/screens/leave_requests/leave_request_page.dart';

// Funds
import 'package:mobile/screens/fund/fund_create_page.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/fund/fund_list_page.dart';
import 'package:mobile/screens/fund/fund_update_page.dart';

Route<dynamic> generateRoute(RouteSettings settings) {
  final name = settings.name;
  // ignore: avoid_print
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
            "ADMIN",
            "MANAGER",
            "PM",
            "ACCOUNTANT",
            "HR",
            "HOD",
            "EMPLOYEE",
            "SECRETARY",
            "CHIEFACCOUNTANT"
          ],
          child: CustomLayout(child: HomePage()),
        ),
      );

    // Attendance
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
            "SECRETARY",
            "CHIEFACCOUNTANT"
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
            "SECRETARY",
            "CHIEFACCOUNTANT"
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
            "SECRETARY",
            "CHIEFACCOUNTANT"

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
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "PM",
            "SECRETARY",
            "ACCOUNTANT",
            "HOD",
            "CHIEFACCOUNTANT"
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

    // Notifications
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
            "CHIEFACCOUNTANT",
            "SECRETARY"
          ],
          child: CustomLayout(child: NotificationListPage()),
        ),
      );

    // Leave requests
    case "/utilities/leave-request":
      return _buildPage(
        allowRoles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "HR",
          "ACCOUNTANT",
          "SECRETARY",
          "CHIEFACCOUNT"
        ],
        child: LeaveRequestPage(),
      );

    // Projects list (menu Utilities → Projects)
    case "/utilities/projects":
      return MaterialPageRoute(
        builder: (_) => RoleGuard(
          allowRoles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
          child: CustomLayout(child: ProjectListPage()),
        ),
      );

    // Project detail (nhận ProjectModel từ arguments)
    case "/projects/detail":
      final project = settings.arguments as ProjectModel?;
      if (project == null) return _errorPage("Thiếu ProjectModel (arguments).");
      return _buildPage(
        allowRoles: ["ADMIN","MANAGER","PM","ACCOUNTANT","HOD","EMPLOYEE"],
        child: ProjectDetailPage(project: project),
      );

    // Kanban board
    case "/projects/kanban":
      final args = settings.arguments as Map<String, dynamic>? ?? {};
      final projectId = args['projectId'] as int?;
      if (projectId == null) return _errorPage("Thiếu projectId cho Kanban.");
      return _buildPage(
        allowRoles: ["ADMIN","MANAGER","PM","HOD","EMPLOYEE"],
        child: KanbanBoardPage(
          projectId: projectId,
          projectName: args['projectName'] as String? ?? 'Kanban',
          phaseName: args['phaseName'] as String?,
          phaseId: args['phaseId'] as int?,
          phaseTaskIds: (args['phaseTaskIds'] as List?)?.cast<int>(),
          phaseCompleted: args['phaseCompleted'] as bool? ?? false,
          projectPmId: args['projectPmId'] as int?,
        ),
      );

    // Funds
    case "/accountant/funds":
      return _buildPage(
        allowRoles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
        ],
        child: FundListPage(),
      );

    case "/accountant/funds/create":
      return _buildPage(
        allowRoles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
        ],
        child: FundCreatePage(),
      );
    //Transaction
    case "/accountant/transactions":
      return _buildPage(
        allowRoles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
        ],
        child: TransactionsPage(),
      );
    case "/accountant/cash-advance":
      {
        return _buildPage(
          allowRoles: [
            "ADMIN",
            "MANAGER",
            "ACCOUNTANT",
            "CHIEFACCOUNTANT",
            "CHIEF_ACCOUNTANT",
            "EMPLOYEE",
            "PM",
            "HR",
            "SECRETARY",
          ],
          child: CashAdvanceListPage(),
        );
      }
    // Bank

    case "/accountant/bank-topup":
      return _buildPage(
        allowRoles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
          "HR",
          "HOD",
          "EMPLOYEE",
          "SECRETARY",
        ],
        child: const BankAndTopupPage(),
      );

    // Auth
    case "/login":
      return MaterialPageRoute(builder: (_) => const LoginPage());

    case "/change-password":
      return MaterialPageRoute(
        builder: (_) => CustomLayout(child: ChangePasswordPage()),
      );

    case "/profile":
      return MaterialPageRoute(
        builder: (_) => CustomLayout(child: ProfilePage()),
      );

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
            "CHIEFACCOUNTANT",
            "SECRETARY"
          ],
          child: CustomLayout(child: LogoutPage()),
        ),
      );

    default:
      return MaterialPageRoute(
        builder: (_) => const Scaffold(body: Center(child: Text("404 - Not found"))),
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
