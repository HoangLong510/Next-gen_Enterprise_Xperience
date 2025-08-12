enum AttendanceStatus {
  NOT_CHECKED_IN, // 👈 FE tự định nghĩa thêm
  CHECKED_IN,
  CHECKED_OUT,
  MISSING_CHECKOUT,
  RESOLVED,
  REJECTED,
}

extension AttendanceStatusExtension on AttendanceStatus {
  String get displayName {
    switch (this) {
      case AttendanceStatus.NOT_CHECKED_IN:
        return 'Chưa check-in';
      case AttendanceStatus.CHECKED_IN:
        return 'Đã check-in';
      case AttendanceStatus.CHECKED_OUT:
        return 'Đã check-out';
      case AttendanceStatus.MISSING_CHECKOUT:
        return 'Thiếu check-out';
      case AttendanceStatus.RESOLVED:
        return 'Đã giải trình';
      case AttendanceStatus.REJECTED:
        return 'Bị từ chối';
    }
  }

  static AttendanceStatus fromString(String value) {
    switch (value) {
      case 'CHECKED_IN':
        return AttendanceStatus.CHECKED_IN;
      case 'CHECKED_OUT':
        return AttendanceStatus.CHECKED_OUT;
      case 'MISSING_CHECKOUT':
        return AttendanceStatus.MISSING_CHECKOUT;
      case 'RESOLVED':
        return AttendanceStatus.RESOLVED;
      case 'REJECTED':
        return AttendanceStatus.REJECTED;
      default:
        return AttendanceStatus.NOT_CHECKED_IN; // 👈 fallback mặc định
    }
  }
}
