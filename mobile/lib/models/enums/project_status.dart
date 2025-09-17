import 'package:easy_localization/easy_localization.dart';

enum ProjectStatus { PLANNING, IN_PROGRESS, COMPLETED, CANCELED }

extension ProjectStatusX on ProjectStatus {
  /// i18n theo key: kanban.status.{name}
  /// Fallback: nếu thiếu key -> trả về name (PLANNING/IN_PROGRESS/...)
  String get displayName {
    final key = 'kanban.status.$name';
    final translated = key.tr();
    return translated == key ? name : translated;
  }

  static ProjectStatus fromString(String value) {
    return ProjectStatus.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => ProjectStatus.PLANNING,
    );
  }
}
