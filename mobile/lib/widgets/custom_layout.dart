import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/providers/notification_provider.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/widgets/notification_icon.dart';
import 'custom_drawer.dart';

class CustomLayout extends StatelessWidget {
  final Widget child;
  const CustomLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final notiProvider = context.read<NotificationProvider>();
    // Nếu chưa có thông tin account, hiển thị loading
    if (authProvider.account == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    notiProvider.connectRealtime(authProvider.account!.username!);

    return Scaffold(
      appBar: AppBar(
        title: Text(dotenv.env["APP_NAME"] ?? "App"),
        actions: [
          NotificationIcon()
        ],
      ),
      drawer: const CustomDrawer(),
      body: child,
    );
  }
}
