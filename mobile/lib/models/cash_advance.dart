class CashAdvance {
  final int id;
  final int? taskId;
  final String? taskName;
  final double amount;
  final String? reason;
  final String status;
  final String? fileUrl;
  final DateTime createdAt;

  CashAdvance({
    required this.id,
    this.taskId,
    this.taskName,
    required this.amount,
    this.reason,
    required this.status,
    this.fileUrl,
    required this.createdAt,
  });

  factory CashAdvance.fromJson(Map<String, dynamic> json) {
    return CashAdvance(
      id: json['id'],
      taskId: json['taskId'],
      taskName: json['taskName'],
      amount: (json['amount'] as num).toDouble(),
      reason: json['reason'],
      status: json['status'],
      fileUrl: json['fileUrl'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
