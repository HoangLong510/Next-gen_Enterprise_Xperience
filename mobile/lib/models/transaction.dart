class FundTransaction {
  final int id;
  final int fundId; 
  final String type;
  final double amount;
  final String? note;
  final String createdBy;
  final String createdByDisplay;
  final String? createdByAvatar;
  final DateTime createdAt;
  final String? fileUrl;
  final String status;
  final String? approvalComment;
  final String? approvedBy;
  final String? approvedByDisplay;
  final String? approvedByAvatar;
  final DateTime? approvedAt;

  FundTransaction({
    required this.id,
    required this.fundId, 
    required this.type,
    required this.amount,
    this.note,
    required this.createdBy,
    required this.createdByDisplay,
    this.createdByAvatar,
    required this.createdAt,
    this.fileUrl,
    required this.status,
    this.approvalComment,
    this.approvedBy,
    this.approvedByDisplay,
    this.approvedByAvatar,
    this.approvedAt,
  });

  factory FundTransaction.fromJson(Map<String, dynamic> json) {
    return FundTransaction(
      id: json['id'],
      fundId: json['fundId'], 
      type: json['type'],
      amount: (json['amount'] as num).toDouble(),
      note: json['note'],
      createdBy: json['createdBy'],
      createdByDisplay: json['createdByDisplay'],
      createdByAvatar: json['createdByAvatar'],
      createdAt: DateTime.parse(json['createdAt']),
      fileUrl: json['fileUrl'],
      status: json['status'],
      approvalComment: json['approvalComment'],
      approvedBy: json['approvedBy'],
      approvedByDisplay: json['approvedByDisplay'],
      approvedByAvatar: json['approvedByAvatar'],
      approvedAt: json['approvedAt'] != null
          ? DateTime.parse(json['approvedAt'])
          : null,
    );
  }
}
