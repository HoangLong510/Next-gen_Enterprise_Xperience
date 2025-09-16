import 'package:easy_localization/easy_localization.dart';

enum TaskStatus { PLANNING, IN_PROGRESS, IN_REVIEW, COMPLETED, CANCELED }

extension TaskStatusX on TaskStatus {
  /// i18n theo key: kanban.status.{name}
  /// Fallback: nếu thiếu key -> trả về name
  String get displayName {
    final key = 'kanban.status.$name';
    final translated = key.tr();
    return translated == key ? name : translated;
  }

  static TaskStatus fromString(String value) {
    return TaskStatus.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => TaskStatus.PLANNING,
    );
  }
}
