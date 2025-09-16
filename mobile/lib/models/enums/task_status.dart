import 'package:easy_localization/easy_localization.dart';

enum PhaseStatus { PLANNING, IN_PROGRESS, COMPLETED, CANCELED }

extension PhaseStatusX on PhaseStatus {
  /// i18n theo key: kanban.status.{name}
  /// Fallback: nếu thiếu key -> trả về name
  String get displayName {
    final key = 'kanban.status.$name';
    final translated = key.tr();
    return translated == key ? name : translated;
  }

  static PhaseStatus fromString(String value) {
    return PhaseStatus.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => PhaseStatus.PLANNING,
    );
  }
}
