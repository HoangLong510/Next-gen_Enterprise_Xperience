class Fund {
  final int id;
  final String name;
  final double balance;
  final String status;
  final String? purpose;
  final String? createdByName;
  final String? updatedByName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? lockedUntil;

  Fund({
    required this.id,
    required this.name,
    required this.balance,
    required this.status,
    this.purpose,
    this.createdByName,
    this.updatedByName,
    required this.createdAt,
    this.updatedAt,
    this.lockedUntil,
  });

  factory Fund.fromJson(Map<String, dynamic> json) {
    return Fund(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name'] ?? '',
      balance: (json['balance'] is int || json['balance'] is double)
          ? (json['balance'] ?? 0).toDouble()
          : double.tryParse(json['balance'].toString()) ?? 0.0,
      status: json['status'] ?? '',
      purpose: json['purpose'],
      createdByName: json['createdBy'] ?? json['createdByName'],
      updatedByName: json['updatedBy'] ?? json['updatedByName'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'])
          : null,
      lockedUntil: json['lockedUntil'] != null
          ? DateTime.tryParse(json['lockedUntil'])
          : (json['lockDate'] != null
                ? DateTime.tryParse(json['lockDate'])
                : null),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "name": name,
      "balance": balance,
      "status": status,
      "purpose": purpose,
      "createdBy": createdByName,
      "updatedBy": updatedByName,
      "createdAt": createdAt.toIso8601String(),
      "updatedAt": updatedAt?.toIso8601String(),
      "lockedUntil": lockedUntil?.toIso8601String(),
    };
  }
}
