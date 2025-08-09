import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';
import 'package:mobile/screens/fund/fund_create_page.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/fund/fund_list_page.dart';
import 'package:mobile/screens/fund/fund_update_page.dart';
import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';
import 'package:mobile/screens/salaries/salary_detail_page.dart';
import 'package:mobile/screens/salaries/salary_summary_page.dart';
import 'package:mobile/screens/transaction/transaction_approve_page.dart';
import 'package:mobile/widgets/custom_layout.dart';
import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';
import 'package:mobile/screens/notifaications/notification_list_page.dart';

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
        // /accountant/funds/:id
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
      final id = int.tryParse(name.split("/")[3]);
      if (id != null) {
        return _buildPage(
          allowRoles: ["ADMIN", "ACCOUNTANT"],
          child: FundUpdatePage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID quỹ không hợp lệ khi chỉnh sửa");
      }
    }

  // /accountant/salaries/:id 
  if (name.startsWith("/accountant/salaries/") && RegExp(r'^/accountant/salaries/\d+$').hasMatch(name)) {
    final id = int.tryParse(name.split("/").last);
    if (id != null) {
      return _buildPage(
        allowRoles: ["ADMIN", "MANAGER"],
        child: SalaryDetailPage(salaryId: id),
      );
    } else {
      return _errorPage("Lỗi: ID phiếu lương không hợp lệ");
    }
  }

    // TODO: /project/:id nếu sau này có
    // if (name.startsWith("/project/")) { ... }
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

    case "/accountant/transaction/approve":
      return _buildPage(
        allowRoles: ["ADMIN", "ACCOUNTANT"],
        child: TransactionsPage(),
      );

    case "/accountant/salaries":
      return _buildPage(
        allowRoles: ["ADMIN", "MANAGER"],
        child: SalarySummaryPage(),
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
