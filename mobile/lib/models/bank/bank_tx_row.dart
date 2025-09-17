class BankTxRow {
  final String refId;
  final String type; // CREDIT / DEBIT
  final double amount;
  final String? description;
  final String? counterAccountNo;
  final DateTime? txTime;

  BankTxRow({
    required this.refId,
    required this.type,
    required this.amount,
    this.description,
    this.counterAccountNo,
    this.txTime,
  });

  factory BankTxRow.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(String? v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v);
      } catch (_) {
        return null;
      }
    }

    return BankTxRow(
      refId: json['refId']?.toString() ?? '',
      type: json['type']?.toString() ?? 'CREDIT',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount'].toString()) ?? 0,
      description: json['description']?.toString(),
      counterAccountNo: json['counterAccountNo']?.toString(),
      txTime: parseDate(json['txTime']?.toString()),
    );
  }
}
