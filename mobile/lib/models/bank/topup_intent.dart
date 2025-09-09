import 'package:mobile/models/bank/topup_status.dart';

class TopupIntent {
  final String code;
  final int amount;
  final String bankAccountNo;
  final TopupStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;

  const TopupIntent({
    required this.code,
    required this.amount,
    required this.bankAccountNo,
    required this.status,
    required this.createdAt,
    this.completedAt,
  });

  TopupIntent copyWith({
    String? code,
    int? amount,
    String? bankAccountNo,
    TopupStatus? status,
    DateTime? createdAt,
    DateTime? completedAt,
  }) {
    return TopupIntent(
      code: code ?? this.code,
      amount: amount ?? this.amount,
      bankAccountNo: bankAccountNo ?? this.bankAccountNo,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}
