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
      MenuItemData(
        label: "Accounts",
        icon: Icons.manage_accounts,
        route: "/management/accounts",
        roles: ["ADMIN"],
      ),
      MenuItemData(
        label: "Settings",
        icon: Icons.settings,
        route: "/management/settings",
        roles: ["ADMIN"],
      ),
    ],
  ),
  MenuSection(
    title: "Employees",
    items: [
      MenuItemData(
        label: "Profiles",
        icon: Icons.assignment_ind,
        route: "/employees/profiles",
        roles: ["ADMIN", "MANAGER"],
      ),
      MenuItemData(
        label: "Contracts",
        icon: Icons.file_present,
        route: "/employees/contracts",
        roles: ["ADMIN", "MANAGER"],
      ),
    ],
  ),
  // Finances (bị trùng với Management > Finance) đã được loại bỏ
  MenuSection(
    title: "Utilities",
    items: [
      MenuItemData(
        label: "Departments",
        icon: Icons.diversity_1,
        route: "/departments",
        roles: ["ADMIN", "MANAGER", "HOD", "EMPLOYEE"],
      ),
      MenuItemData(
        label: "Projects",
        icon: Icons.account_tree,
        route: "/utilities/projects",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      ),
      MenuItemData(
        label: "Dispatches",
        icon: Icons.assignment,
        route: "/management/documents",
        roles: ["ADMIN", "MANAGER", "PM"],
      ),
      // Theo rule trước đó: Tasks dành cho HOD & EMPLOYEE
      MenuItemData(
        label: "Tasks",
        icon: Icons.task_alt,
        route: "/utilities/tasks",
        roles: ["HOD", "EMPLOYEE"],
      ),
      MenuItemData(
        label: "Leave Request",
        icon: Icons.description,
        route: "/leave-request",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      ),
    ],
  ),
];
