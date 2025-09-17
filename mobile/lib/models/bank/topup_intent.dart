import 'package:mobile/models/account.dart';
import 'topup_status.dart';

class TopupOwner {
  final int? accountId;
  final int? employeeId;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? phone;
  final String? avatar;

  TopupOwner({
    this.accountId,
    this.employeeId,
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.avatar,
  });

  factory TopupOwner.fromJson(Map<String, dynamic> json) {
    return TopupOwner(
      accountId: json['accountId'] is int ? json['accountId'] : int.tryParse('${json['accountId']}'),
      employeeId: json['employeeId'] is int ? json['employeeId'] : int.tryParse('${json['employeeId']}'),
      firstName: json['firstName']?.toString(),
      lastName: json['lastName']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      avatar: json['avatar']?.toString(),
    );
  }
}

class TopupIntent {
  final String code;
  final double amount;
  final String bankAccountNo;
  final TopupStatus status;
  final String? sepayRefId;
  final DateTime? createdAt;
  final DateTime? completedAt;
  final TopupOwner? owner;

  TopupIntent({
    required this.code,
    required this.amount,
    required this.bankAccountNo,
    required this.status,
    this.sepayRefId,
    this.createdAt,
    this.completedAt,
    this.owner,
  });

  factory TopupIntent.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    return TopupIntent(
      code: json['code']?.toString() ?? '',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse('${json['amount']}') ?? 0,
      bankAccountNo: json['bankAccountNo']?.toString() ?? '',
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
