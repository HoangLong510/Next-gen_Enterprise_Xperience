import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/widgets/language_switcher.dart';
import 'package:provider/provider.dart';
import 'drawer_menu.dart';

class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final account = authProvider.account;

    if (account == null) {
      return const SizedBox.shrink(); // Nếu chưa có user, ẩn Drawer
    }

    final avatarUrl = account.avatar != null
        ? '${dotenv.env["API_URL"]}/${account.avatar}'
        : null;
    final username = account.username ?? "unknown";
    final fullName = "${account.firstName ?? ""} ${account.lastName ?? ""}"
        .trim();

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            currentAccountPicture: CircleAvatar(
              backgroundImage: avatarUrl != null
                  ? NetworkImage(avatarUrl)
                  : null,
              backgroundColor: Colors.grey[300],
              child: avatarUrl == null
                  ? const Icon(Icons.person, color: Colors.white)
                  : null,
            ),
            accountName: Text(
              fullName.isNotEmpty ? fullName : username,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            accountEmail: Text("@$username"),
            decoration: BoxDecoration(color: Theme.of(context).primaryColor),
          ),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text("ViewProfile".tr()),
            onTap: () {
              // Xử lý xem hồ sơ
            },
          ),
          ListTile(
            leading: const Icon(Icons.lock_outline),
            title: Text("ChangePassword".tr()),
            onTap: () {
              // Xử lý đổi mật khẩu
            },
          ),
          ListTile(
            leading: Icon(
              Icons.logout,
              color: Theme.of(context).colorScheme.error,
            ),
            title: Text(
              "Logout".tr(),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            onTap: () {
              Navigator.of(context).pushNamed('/logout');
            },
          ),
          Divider(),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: LanguageSwitcher(),
          ),
          Divider(),
          buildDrawerMenu(account.role ?? '', context),
        ],
      ),
    );
  }
}
