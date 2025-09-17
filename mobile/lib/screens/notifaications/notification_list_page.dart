import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/notification.dart';
import 'package:mobile/models/enums/notification_type.dart';
import 'package:mobile/providers/notification_provider.dart';
import 'package:mobile/services/notification_service.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:easy_localization/easy_localization.dart';

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
      if (!mounted) return;
      setState(() {
        initialList = preview;
        loading = false;
      });
    } else {
      setState(() => loading = false);
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
      if (!mounted) return;
      context.read<NotificationProvider>().setNotifications(full);
      setState(() {
        showAll = true;
        loading = false;
      });
    } else {
      setState(() => loading = false);
    }
  }

  // ---------- Helpers: parse & translate content ----------
  Map<String, dynamic>? _parseNotiContent(String? content) {
    if (content == null || content.isEmpty) return null;
    try {
      final first = jsonDecode(content);
      if (first is String) {
        // double-encoded JSON
        return jsonDecode(first) as Map<String, dynamic>;
      }
      return first as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  String _interpolateMustache(String template, Map<String, dynamic>? params) {
    if (template.isEmpty || params == null || params.isEmpty) return template;
    return template.replaceAllMapped(RegExp(r'{{\s*([\w.]+)\s*}}'), (m) {
      final key = m.group(1)!;
      final val = params[key];
      return (val == null) ? m[0]! : val.toString();
    });
  }

  String _trNotiContent(String? content) {
    final parsed = _parseNotiContent(content);
    if (parsed == null) return content ?? '';
    final key = parsed['key'] as String?;
    final paramsDyn = parsed['params'];
    Map<String, dynamic>? params;
    if (paramsDyn is Map) {
      params = paramsDyn.map((k, v) => MapEntry(k.toString(), v));
    }
    if (key == null || key.isEmpty) return content ?? '';
    final template = tr(key);
    return _interpolateMustache(template, params);
  }

  Future<void> _handleRedirect(NotificationModel n) async {
    if (!n.read) {
      final success = await NotificationService.markAsRead(n.id);
      if (success && mounted) {
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
      case NotificationType.ATTENDANCE:
      // tuỳ app bạn config route thế nào
        Navigator.pushNamed(context, '/attendance/detail', arguments: n.referenceId);
        break;
      case NotificationType.TASK:
        final parsed = _parseNotiContent(n.content);

        final dynamic rawParams = parsed?['params'];
        final Map<String, dynamic>? p = rawParams is Map
            ? rawParams.map((k, v) => MapEntry(k.toString(), v))
            : null;

        final pid = p?['projectId'];
        final phid = p?['phaseId'];

        if (pid != null && phid != null) {
          Navigator.pushNamed(context, '/projects/$pid/phase/$phid/kanban');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(tr('the-path-you-are-trying-to-access-is-invalid'))),
          );
        }
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
      appBar: AppBar(title: Text(tr("all-notifications"))),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : notis.isEmpty
          ? Center(child: Text(tr("no-notifications")))
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
                    tr(n.title),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(_trNotiContent(n.content)),
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
