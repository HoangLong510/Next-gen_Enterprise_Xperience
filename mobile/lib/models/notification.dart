import 'package:mobile/models/enums/notification_type.dart';

class NotificationModel {
  final int id;
  final String title;
  final String content;
  final bool read;
  final DateTime createdAt;
  final NotificationType type;
  final int? referenceId;
  final String? senderUsername;
  final String? senderFullName;
  final String? senderAvatar;

  NotificationModel({
    required this.id,
    required this.title,
    required this.content,
    required this.read,
    required this.createdAt,
    required this.type,
    this.referenceId,
    this.senderUsername,
    this.senderFullName,
    this.senderAvatar,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      title: json['title'],
      content: json['content'],
      read: json['read'],
      createdAt: DateTime.parse(json['createdAt']),
      type: NotificationTypeExtension.fromString(json['type']),
      referenceId: json['referenceId'],
      senderUsername: json['senderUsername'],
      senderFullName: json['senderFullName'],
      senderAvatar: json['senderAvatar'], // ✅ LẤY TRỰC TIẾP
    );
  }

  /// ✅ Thêm hàm copyWith tại đây
  NotificationModel copyWith({bool? read}) {
    return NotificationModel(
      id: id,
      title: title,
      content: content,
      read: read ?? this.read,
      createdAt: createdAt,
      type: type,
      referenceId: referenceId,
      senderUsername: senderUsername,
      senderFullName: senderFullName,
      senderAvatar: senderAvatar,
    );
  }
}
