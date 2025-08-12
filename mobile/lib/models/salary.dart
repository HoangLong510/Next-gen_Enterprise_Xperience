import 'package:mobile/models/enums/payment_method.dart';
import 'package:mobile/models/enums/salary_status.dart';

import 'account.dart';

class Salary {
  final int id;
  final Account employee;
  final int baseSalary;
  final int workingDays;
  final int actualSalary;

  final int allowanceLunch;
  final int allowancePhone;
  final int allowanceResponsibility;

  final int totalSalary;

  final int deductionBhxh;
  final int deductionBhyt;
  final int deductionBhtn;

  final int total;

  final int month;
  final int year;

  final String createdBy;
  final String? createdByAvatar;
  final String? fileUrl;

  final SalaryStatus status;
  final PaymentMethod? paymentMethod; 

  Salary({
    required this.id,
    required this.employee,
    required this.baseSalary,
    required this.workingDays,
    required this.actualSalary,
    required this.allowanceLunch,
    required this.allowancePhone,
    required this.allowanceResponsibility,
    required this.totalSalary,
    required this.deductionBhxh,
    required this.deductionBhyt,
    required this.deductionBhtn,
    required this.total,
    required this.month,
    required this.year,
    required this.createdBy,
    this.createdByAvatar,
    this.fileUrl,
    required this.status,
    this.paymentMethod, 
  });

  factory Salary.fromJson(Map<String, dynamic> json) {
  return Salary(
    id: json['id'] ?? 0,
    employee: Account.fromJson(json['employee']),
    baseSalary: (json['baseSalary'] ?? 0).toInt(),
    workingDays: (json['workingDays'] ?? 0).toInt(),
    actualSalary: (json['actualSalary'] ?? 0).toInt(),
    allowanceLunch: (json['allowanceLunch'] ?? 0).toInt(),
    allowancePhone: (json['allowancePhone'] ?? 0).toInt(),
    allowanceResponsibility: (json['allowanceResponsibility'] ?? 0).toInt(),
    totalSalary: (json['totalSalary'] ?? 0).toInt(),
    deductionBhxh: (json['deductionBhxh'] ?? 0).toInt(),
    deductionBhyt: (json['deductionBhyt'] ?? 0).toInt(),
    deductionBhtn: (json['deductionBhtn'] ?? 0).toInt(),
    total: (json['total'] ?? 0).toInt(),
    month: (json['month'] ?? 0).toInt(),
    year: (json['year'] ?? 0).toInt(),
    createdBy: json['createdBy'] ?? '',
    createdByAvatar: json['createdByAvatar'],
    fileUrl: json['fileUrl'],
    status: SalaryStatusExtension.fromString(json['status']),
    paymentMethod: PaymentMethodExtension.fromString(json['paymentMethod']),
  );
}

}
