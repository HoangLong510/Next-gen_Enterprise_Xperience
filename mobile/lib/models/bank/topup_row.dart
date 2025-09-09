import 'package:mobile/models/account.dart';
import 'package:mobile/models/bank/topup_status.dart';

class TopupRow {
  final int? id;
  final String code;
  final int amount;
  final String? bankAccountNo;
  final TopupStatus status;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final Account? owner;

  const TopupRow({
    this.id,
    required this.code,
    required this.amount,
    this.bankAccountNo,
    required this.status,
    this.completedAt,
    this.createdAt,
    this.owner,
  });
}
