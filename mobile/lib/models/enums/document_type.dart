enum DocumentType { ADMINISTRATIVE, PROJECT, OTHER }

extension DocumentTypeX on DocumentType {
  static DocumentType fromString(String value) {
    return DocumentType.values.firstWhere(
        (e) => e.toString().split('.').last == value,
        orElse: () => DocumentType.OTHER);
  }

  String get displayName {
    switch (this) {
      case DocumentType.ADMINISTRATIVE:
        return "Hành chính";
      case DocumentType.PROJECT:
        return "Dự án";
      case DocumentType.OTHER:
        return "Khác";
    }
  }
}
