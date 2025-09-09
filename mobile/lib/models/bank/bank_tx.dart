class BankTx {
  final String refId;
  final String type;        
  final int amount;
  final String? description;
  final String? counterAccountNo;
  final DateTime? txTime;

  const BankTx({
    required this.refId,
    required this.type,
    required this.amount,
    this.description,
    this.counterAccountNo,
    this.txTime,
  });
}
