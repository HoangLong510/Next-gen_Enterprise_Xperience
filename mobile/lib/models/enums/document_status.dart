enum DocumentStatus { NEW, SIGNED, IN_PROGRESS, COMPLETED }

extension DocumentStatusX on DocumentStatus {
  static DocumentStatus fromString(String value) {
    return DocumentStatus.values.firstWhere(
        (e) => e.toString().split('.').last == value,
        orElse: () => DocumentStatus.NEW);
  }

  String get displayName {
    switch (this) {
      case DocumentStatus.NEW:
        return "Chưa ký";
      case DocumentStatus.SIGNED:
        return "Đã ký";
      case DocumentStatus.IN_PROGRESS:
        return "Đang xử lý";
      case DocumentStatus.COMPLETED:
        return "Hoàn tất";
    }
  }
}
