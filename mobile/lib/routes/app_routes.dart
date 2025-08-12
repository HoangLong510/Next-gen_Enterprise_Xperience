import 'package:flutter/material.dart';
import 'package:mobile/guards/role_guard.dart';

import 'package:mobile/screens/home_page.dart';
import 'package:mobile/screens/login_page.dart';
import 'package:mobile/screens/logout_page.dart';

import 'package:mobile/widgets/custom_layout.dart';

import 'package:mobile/screens/dispatches/dispatches_list_page.dart';
import 'package:mobile/screens/dispatches/dispatch_detail_page.dart';
import 'package:mobile/screens/dispatches/dispatch_create_page.dart';
import 'package:mobile/screens/notifaications/notification_list_page.dart';

import 'package:mobile/screens/projects/project_list_page.dart';

import 'package:mobile/screens/fund/fund_create_page.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/fund/fund_list_page.dart';
import 'package:mobile/screens/fund/fund_update_page.dart';

import 'package:mobile/screens/salaries/salary_detail_page.dart';
import 'package:mobile/screens/salaries/salary_summary_page.dart';

import 'package:mobile/screens/transaction/transaction_approve_page.dart';

Route<dynamic> generateRoute(RouteSettings settings) {
  final name = settings.name;
  print("Route: $name");

  // --- 1) Dynamic routes ---
  if (name != null) {
    // /management/documents/:id
    if (name.startsWith("/management/documents/")) {
      final id = int.tryParse(name.split("/").last);
      if (id != null) {
        return _buildPage(
          allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
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
          allowRoles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "HOD", "SECRETARY"],
          child: DispatchDetailPage(id: id),
        );
      } else {
        return _errorPage("Lỗi: ID document không hợp lệ");
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

    // /accountant/funds
