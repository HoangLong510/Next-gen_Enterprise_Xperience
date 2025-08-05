// models/enums/notification_type.dart
enum NotificationType {
  DOCUMENT,
  PROJECT,
  TASK,
  ORDER,
  GENERAL,
  LEAVE_REQUEST,
  ATTENDANCE,
}

extension NotificationTypeExtension on NotificationType {
  static NotificationType fromString(String value) {
    return NotificationType.values.firstWhere(
      (e) => e.toString().split('.').last == value,
      orElse: () => NotificationType.GENERAL,
    );
  }

  String get label {
    switch (this) {
      case NotificationType.DOCUMENT:
        return 'Document';
      case NotificationType.PROJECT:
        return 'Project';
      case NotificationType.TASK:
        return 'Task';
      case NotificationType.ORDER:
        return 'Order';
      case NotificationType.LEAVE_REQUEST:
        return 'Leave';
      case NotificationType.ATTENDANCE:
        return 'Attendance';
      default:
        return 'General';
    }
  }
}
