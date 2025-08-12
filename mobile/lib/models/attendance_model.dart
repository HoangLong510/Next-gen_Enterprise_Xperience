import 'package:mobile/models/account.dart';
import 'package:mobile/models/enums/attendance_status.dart';

class Attendance {
  final int id;
  final Account account;
  final DateTime checkInTime;
  final String? checkInImagePath;
  final bool? faceMatch;
  final bool? locationValid;
  final double? distanceKm;

  final DateTime? checkOutTime;
  final String? checkOutImagePath;
  final bool checkedOut;

  // --- mới: tách note nhân viên & HR + metadata quyết định
  final String? checkOutEmployeeNote; // nhân viên gửi
  final String? checkOutHrNote;       // HR phản hồi
  final String? hrDecision;           // APPROVED / REJECTED
  final DateTime? hrResolvedAt;
  final Account? hrResolvedBy;        // nếu BE trả account HR (có thể null)

  final AttendanceStatus status;

  Attendance({
    required this.id,
    required this.account,
    required this.checkInTime,
    this.checkInImagePath,
    this.faceMatch,
    this.locationValid,
    this.distanceKm,
    this.checkOutTime,
    this.checkOutImagePath,
    required this.checkedOut,
    this.checkOutEmployeeNote,
    this.checkOutHrNote,
    this.hrDecision,
    this.hrResolvedAt,
    this.hrResolvedBy,
    required this.status,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      id: json['id'],
      account: Account.fromJson(json['account']),
      checkInTime: DateTime.parse(json['checkInTime']),
      checkInImagePath: json['checkInImagePath'],
      faceMatch: json['faceMatch'],
      locationValid: json['locationValid'],
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      checkOutTime: json['checkOutTime'] != null
          ? DateTime.parse(json['checkOutTime'])
          : null,
      checkOutImagePath: json['checkOutImagePath'],
      checkedOut: json['checkedOut'] == true, // tránh null

      // các field mới
      checkOutEmployeeNote: json['checkOutEmployeeNote'],
      checkOutHrNote: json['checkOutHrNote'],
      hrDecision: json['hrDecision'],
      hrResolvedAt: json['hrResolvedAt'] != null
          ? DateTime.parse(json['hrResolvedAt'])
          : null,
      hrResolvedBy: json['hrResolvedBy'] != null
          ? Account.fromJson(json['hrResolvedBy'])
          : null,

      status: AttendanceStatusExtension.fromString(json['status']),
    );
  }
}
