enum SalaryStatus {
  PENDING,
  APPROVED,
  PAID,
}

extension SalaryStatusExtension on SalaryStatus {
  String get label {
    switch (this) {
      case SalaryStatus.PENDING:
        return "Chờ duyệt";
      case SalaryStatus.APPROVED:
        return "Đã duyệt";
      case SalaryStatus.PAID:
        return "Đã thanh toán";
    }
  }

  static SalaryStatus fromString(String value) {
    return SalaryStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => SalaryStatus.PENDING,
    );
  }
}
