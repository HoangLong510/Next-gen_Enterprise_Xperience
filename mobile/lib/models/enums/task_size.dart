enum TaskSize { S, M, L }

extension TaskSizeX on TaskSize {
  String get displayName {
    switch (this) {
      case TaskSize.S: return 'S';
      case TaskSize.M: return 'M';
      case TaskSize.L: return 'L';
    }
  }

  static TaskSize? fromString(String? v) {
    if (v == null) return null;
    final up = v.toUpperCase();
    for (final e in TaskSize.values) {
      if (e.name.toUpperCase() == up) return e;
    }
    return null; // không match -> để null
  }
}
