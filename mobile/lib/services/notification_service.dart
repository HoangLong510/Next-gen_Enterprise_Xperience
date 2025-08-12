import 'package:mobile/models/notification.dart';
import 'package:mobile/services/api_service.dart';

class NotificationService {
  static Future<List<NotificationModel>> fetchMyNotifications(
    String username, {
    int size = 10,
  }) async {
    final res = await ApiService.client.get('/notifications/$username');
    final list = (res.data['data'] as List)
        .map((e) => NotificationModel.fromJson(e))
        .toList();

    if (size == -1) return list;
    return list.take(size).toList(); // ✅ Giới hạn phía client
  }

  static Future<bool> markAsRead(int id) async {
    try {
      final res = await ApiService.client.put('/notifications/$id/read');
      return res.data['status'] == 200;
    } catch (_) {
      return false;
    }
  }
}
