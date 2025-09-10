enum PaymentMethod {
  CASH,
  BANK_TRANSFER,
}

extension PaymentMethodExtension on PaymentMethod {
  String get label {
    switch (this) {
      case PaymentMethod.CASH:
        return "Tiền mặt";
      case PaymentMethod.BANK_TRANSFER:
        return "Chuyển khoản";
    }
  }

  static PaymentMethod? fromString(String? value) {
    if (value == null) return null;
    return PaymentMethod.values.firstWhere(
      (e) => e.name == value,
      orElse: () => PaymentMethod.CASH,
    );
  }
}
