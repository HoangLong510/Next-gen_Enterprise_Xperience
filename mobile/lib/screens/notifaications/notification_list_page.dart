import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/notification.dart';
import 'package:mobile/models/enums/notification_type.dart';
import 'package:mobile/providers/notification_provider.dart';
import 'package:mobile/services/notification_service.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class NotificationListPage extends StatefulWidget {
  const NotificationListPage({super.key});

  @override
  State<NotificationListPage> createState() => _NotificationListPageState();
}

class _NotificationListPageState extends State<NotificationListPage> {
  bool loading = true;
  bool showAll = false;

  List<NotificationModel> initialList = [];

  @override
  void initState() {
    super.initState();
    _loadInitialNotifications();
  }

  Future<void> _loadInitialNotifications() async {
    final username = context.read<NotificationProvider>().username;
    if (username != null) {
      final preview = await NotificationService.fetchMyNotifications(
        username,
        size: 10,
      );
      setState(() {
        initialList = preview;
        loading = false;
      });
    }
  }

  Future<void> _loadAllNotifications() async {
    setState(() => loading = true);
    final username = context.read<NotificationProvider>().username;
    if (username != null) {
      final full = await NotificationService.fetchMyNotifications(
        username,
        size: -1,
      );
      context.read<NotificationProvider>().setNotifications(full);
      setState(() {
        showAll = true;
        loading = false;
      });
    }
  }

  void _handleRedirect(NotificationModel n) async {
    if (!n.read) {
      final success = await NotificationService.markAsRead(n.id);
      if (success) {
        context.read<NotificationProvider>().markAsRead(n.id);
      }
    }

    switch (n.type) {
      case NotificationType.DOCUMENT:
        Navigator.pushNamed(context, '/management/documents/${n.referenceId}');
        break;
      case NotificationType.PROJECT:
        Navigator.pushNamed(context, '/project/${n.referenceId}');
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chưa hỗ trợ loại thông báo này')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final notis = showAll
        ? context.watch<NotificationProvider>().notifications
        : initialList;
    final apiUrl = dotenv.env["API_URL"];

    return Scaffold(
      appBar: AppBar(title: const Text("Tất cả thông báo")),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : notis.isEmpty
              ? const Center(child: Text("Không có thông báo nào"))
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        itemCount: notis.length,
                        itemBuilder: (_, index) {
                          final n = notis[index];
                          final fullAvatarUrl = n.senderAvatar != null
                              ? "$apiUrl/${n.senderAvatar}"
                              : null;

                          return ListTile(
                            leading: CircleAvatar(
                              radius: 24,
                              backgroundColor: Colors.grey[300],
                              backgroundImage: fullAvatarUrl != null
                                  ? NetworkImage(fullAvatarUrl)
                                  : null,
                              child: fullAvatarUrl == null
                                  ? const Icon(Icons.person, color: Colors.white)
                                  : null,
                            ),
                            title: Text(
                              n.title,
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text(n.content),
                            trailing: Text(
                              DateFormat('HH:mm dd/MM').format(n.createdAt),
                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            tileColor: n.read ? null : Colors.grey[200],
                            onTap: () => _handleRedirect(n),
                          );
                        },
                      ),
                    ),
                    if (!showAll && initialList.length == 10)
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: TextButton(
                          onPressed: _loadAllNotifications,
                          child: const Text("Hiển thị tất cả"),
                        ),
                      ),
                  ],
                ),
    );
  }
}
