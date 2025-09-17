import 'package:flutter/material.dart';

class MenuItemData {
  final String label;
  final IconData icon;
  final String route;
  final List<String> roles;

  const MenuItemData({
    required this.label,
    required this.icon,
    required this.route,
    required this.roles,
  });
}

class MenuSection {
  final String title;
  final List<MenuItemData> items;

  const MenuSection({required this.title, required this.items});
}

const List<MenuSection> menuItems = [
  MenuSection(
    title: "Management",
    items: [
      MenuItemData(
        label: "Finance",
        icon: Icons.attach_money,
        route: "/management/finance",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      ),
    ],
  ),
  MenuSection(
    title: "Finance",
    items: [
      MenuItemData(
        label: "Funds",
        icon: Icons.savings,
        route: "/accountant/funds",
        roles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
        ],
      ),
      MenuItemData(
        label: "Transactions",
        icon: Icons.compare_arrows,
        route: "/accountant/transactions",
        roles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEFACCOUNTANT",
        ],
      ),
      MenuItemData(
        label: "Cash Advance",
        icon: Icons.payments,
        route: "/accountant/cash-advance",
        roles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
          "EMPLOYEE",
        ],
      ),
      MenuItemData(
        label: "Bank & Top-up",
        icon: Icons.account_balance_wallet,
        route: "/accountant/bank-topup",
        roles: [
          "ADMIN",
          "MANAGER",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "CHIEF_ACCOUNTANT",
        ],
      ),
      
      MenuItemData(
      label: "Salary Summary",
      icon: Icons.receipt_long,
      route: "/accountant/salaries/summary",
      roles: [
        "ADMIN",
        "MANAGER",
        "ACCOUNTANT",
        "CHIEFACCOUNTANT",
        "CHIEF_ACCOUNTANT",
      ],
    ),
    ],
  ),
  MenuSection(
    title: "Utilities",
    items: [
      MenuItemData(
        label: "Projects",
        icon: Icons.account_tree,
        route: "/utilities/projects",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE","SECRETARY"],
      ),
      MenuItemData(
        label: "Dispatches",
        icon: Icons.assignment,
        route: "/management/documents",
        roles: ["ADMIN", "MANAGER", "PM","SECRETARY"],
      ),

      // Tasks chỉ dành cho HOD & EMPLOYEE
      MenuItemData(
        label: "Tasks",
        icon: Icons.task_alt,
        route: "/utilities/tasks",
        roles: ["HOD", "EMPLOYEE","SECRETARY"],
      ),

      MenuItemData(
        label: "Leave Request",
        icon: Icons.description,
        route: "/utilities/leave-request",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "HR",
          "ACCOUNTANT",
          "SECRETARY",
          "CHIEFACCOUNTANT",
        ],
      ),
      MenuItemData(
        label: "Missing Check-out",
        icon: Icons.report_gmailerrorred,
        route: "/attendance/missing-checkout",
        roles: ["HR", "ADMIN"],
      ),
      MenuItemData(
        label: "AttenDance",
        icon: Icons.access_time,
        route: "/attendance/list",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "ACCOUNTANT",
          "HR",
          "CHIEFACCOUNTANT"
          "SECRETARY",
        ],
      ),
    ],
  ),
];
