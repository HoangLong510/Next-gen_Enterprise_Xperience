class SalarySummary {
  final int id;
  final String code;
  final String role;
  final String? department;
  final String createdBy;
  final String? createdByAvatar;
  final DateTime createdAt;
  final String? fileUrl;

  final double total;
  final int month;
  final int year;
  final double baseSalary;
  final double actualSalary;
  final String status;

  SalarySummary({
    required this.id,
    required this.code,
    required this.role,
    this.department,
    required this.createdBy,
    this.createdByAvatar,
    required this.createdAt,
    this.fileUrl,
    required this.total,
    required this.month,
    required this.year,
    required this.baseSalary,
    required this.actualSalary,
    required this.status,
  });

  factory SalarySummary.fromJson(Map<String, dynamic> json) {
  return SalarySummary(
    id: json['id'] ?? 0,
    code: json['code'] ?? '',
    role: json['role'] ?? '',
    department: json['department'],
    createdBy: json['createdBy'] ?? '',
    createdByAvatar: json['createdByAvatar'],
    createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    fileUrl: json['fileUrl'],
    total: (json['total'] ?? 0).toDouble(),
    month: (json['month'] ?? 0).toInt(),
    year: (json['year'] ?? 0).toInt(),
    baseSalary: (json['baseSalary'] ?? 0).toDouble(),
    actualSalary: (json['actualSalary'] ?? 0).toDouble(),
    status: json['status'] ?? 'UNKNOWN',
  );
}
}
