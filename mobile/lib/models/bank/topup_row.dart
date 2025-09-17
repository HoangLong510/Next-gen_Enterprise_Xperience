import 'topup_status.dart';
import 'topup_intent.dart';

class TopupRow {
  final int? id;
  final String code;
  final double amount;
  final String? bankAccountNo;
  final TopupStatus status;
  final String? sepayRefId;
  final DateTime? createdAt;
  final DateTime? completedAt;
  final TopupOwner? owner;

  TopupRow({
    this.id,
    required this.code,
    required this.amount,
    this.bankAccountNo,
    required this.status,
    this.sepayRefId,
    this.createdAt,
    this.completedAt,
    this.owner,
  });

  factory TopupRow.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    return TopupRow(
      id: json['id'] is int ? json['id'] : int.tryParse('${json['id']}'),
      code: json['code']?.toString() ?? '',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse('${json['amount']}') ?? 0,
      bankAccountNo: json['bankAccountNo']?.toString(),
      status: TopupStatus.values.firstWhere(
        (e) => e.name.toUpperCase() == (json['status']?.toString().toUpperCase() ?? ''),
        orElse: () => TopupStatus.PENDING,
      ),
      sepayRefId: json['sepayRefId']?.toString(),
      createdAt: parseDate(json['createdAt']),
      completedAt: parseDate(json['completedAt']),
      owner: json['owner'] != null
          ? TopupOwner.fromJson(Map<String, dynamic>.from(json['owner']))
          : null,
    );
  }
}
