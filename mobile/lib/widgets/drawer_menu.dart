import 'package:flutter/material.dart';
import 'package:mobile/constants/menu_items.dart';

Widget buildDrawerMenu(String userRole, BuildContext context) {
  return Column(
    children: menuItems.map((section) {
      final filteredItems = section.items
          .where((item) => item.roles.contains(userRole))
          .toList();

      if (filteredItems.isEmpty) return const SizedBox();

      return Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Text(section.title),
          tilePadding: const EdgeInsets.symmetric(horizontal: 16.0),
          childrenPadding: EdgeInsets.zero,
          collapsedBackgroundColor: Colors.transparent,
          shape: const Border(),
          children: filteredItems.map((item) {
            return Container(
              padding: const EdgeInsets.only(left: 24.0),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                leading: Icon(item.icon),
                title: Text(item.label),
                onTap: () {
                  Navigator.of(context).pushReplacementNamed(item.route);
                },
              ),
            );
          }).toList(),
        ),
      );
    }).toList(),
  );
}
