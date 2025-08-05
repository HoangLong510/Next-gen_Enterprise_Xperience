import 'package:flutter/material.dart';
import 'package:mobile/models/notification.dart';
import 'package:mobile/realtime/notification_socket.dart';

class NotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  String? username;
  bool _connected = false;

  List<NotificationModel> get notifications => _notifications;

  void setNotifications(List<NotificationModel> list) {
    _notifications = list;
    notifyListeners();
  }

  void addNotification(NotificationModel noti) {
    _notifications.insert(0, noti);
    notifyListeners();
  }

  void markAsRead(int id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notifications[index] = _notifications[index].copyWith(read: true);
      notifyListeners();
    }
  }

  void setUsername(String u) {
    username = u;
  }

  void clear() {
    _notifications = [];
    notifyListeners();
  }

  void connectRealtime(String username) {
    if (_connected) return;
    _connected = true;
    this.username = username;
    NotificationSocket.connect(username, this);
  }

  void disconnect() {
  NotificationSocket.disconnect();
  _connected = false;
  username = null;
  clear();
}
  
}
