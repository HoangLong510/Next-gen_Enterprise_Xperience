enum LeaveStatus { PENDING, PENDING_HR, APPROVED, REJECTED, CANCELLED }
LeaveStatus leaveStatusFrom(String? s) => LeaveStatus.values.firstWhere(
  (e) => e.name == (s ?? 'PENDING'),
  orElse: () => LeaveStatus.PENDING,
);
String leaveStatusTo(LeaveStatus s) => s.name;

enum LeaveType { FULL_DAY, HALF_DAY_MORNING, HALF_DAY_AFTERNOON, CUSTOM_HOURS }
LeaveType leaveTypeFrom(String? s) => LeaveType.values.firstWhere(
  (e) => e.name == (s ?? 'FULL_DAY'),
  orElse: () => LeaveType.FULL_DAY,
);
String leaveTypeTo(LeaveType t) => t.name;

class AccountMini {
  final int id;
  final String username;
  final String role;
  final String fullName;
  final String? email;
  final String? phone;
  const AccountMini({
    required this.id,
    required this.username,
    required this.role,
    required this.fullName,
    this.email,
    this.phone,
  });
  factory AccountMini.fromJson(Map<String, dynamic> j) => AccountMini(
    id: j['id'] is int ? j['id'] : int.parse('${j['id']}'),
    username: j['username'] ?? '',
    role: j['role'] ?? '',
    fullName: j['fullName'] ?? '',
    email: j['email'],
    phone: j['phone'],
  );
}

class LeaveRequest {
  final int id;
  final String reason;
  final String? startDate; // yyyy-MM-dd
  final String? endDate;   // yyyy-MM-dd
  final List<String>? daysOff; // yyyy-MM-dd[]
  final String? startTime; // HH:mm[:ss]
  final String? endTime;   // HH:mm[:ss]
  final LeaveType leaveType;
  final LeaveStatus status;
  final AccountMini? sender;
  final AccountMini? receiver;
  final String? createdAt; // ISO
  final String? updatedAt; // ISO
  final String? signature; // base64

  const LeaveRequest({
    required this.id,
    required this.reason,
    required this.leaveType,
    required this.status,
    this.startDate,
    this.endDate,
    this.daysOff,
    this.startTime,
    this.endTime,
    this.sender,
    this.receiver,
    this.createdAt,
    this.updatedAt,
    this.signature,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> j) => LeaveRequest(
    id: j['id'] is int ? j['id'] : int.parse('${j['id']}'),
    reason: j['reason'] ?? '',
    startDate: j['startDate'],
    endDate: j['endDate'],
    daysOff: (j['daysOff'] as List?)?.map((e) => '$e').toList(),
    startTime: j['startTime']?.toString(),
    endTime: j['endTime']?.toString(),
    leaveType: leaveTypeFrom(j['leaveType']),
    status: leaveStatusFrom(j['status']),
    sender: j['sender'] != null ? AccountMini.fromJson(j['sender']) : null,
    receiver: j['receiver'] != null ? AccountMini.fromJson(j['receiver']) : null,
    createdAt: j['createdAt']?.toString(),
    updatedAt: j['updatedAt']?.toString(),
    signature: j['signature'],
  );
}

class PageResultLeave {
  final List<LeaveRequest> items;
  final int totalPages;
  final int currentPage;
  final int totalElements;

  const PageResultLeave({
    required this.items,
    required this.totalPages,
    required this.currentPage,
    required this.totalElements,
  });

  factory PageResultLeave.fromJson(Map<String, dynamic> j) => PageResultLeave(
    items: (j['items'] as List? ?? [])
      .map((e) => LeaveRequest.fromJson(e as Map<String, dynamic>)).toList(),
    totalPages: j['totalPages'] ?? 1,
    currentPage: j['currentPage'] ?? 1,
    totalElements: (j['totalElements'] is int)
      ? j['totalElements']
      : int.tryParse('${j['totalElements'] ?? 0}') ?? 0,
  );
}

class BusyDay {
  final String date; // yyyy-MM-dd
  final int count;
  const BusyDay({required this.date, required this.count});
  factory BusyDay.fromJson(Map<String, dynamic> j) =>
      BusyDay(date: j['date'] ?? '', count: j['count'] ?? 0);
}

class LeaveBalance {
  final int limitPerYear, leaveUsedInYear, leaveLeftInYear;
  final int limitPerMonth, leaveUsedInMonth, leaveLeftInMonth;
  const LeaveBalance({
    required this.limitPerYear,
    required this.leaveUsedInYear,
    required this.leaveLeftInYear,
    required this.limitPerMonth,
    required this.leaveUsedInMonth,
    required this.leaveLeftInMonth,
  });
  factory LeaveBalance.fromJson(Map<String, dynamic> j) => LeaveBalance(
    limitPerYear: j['limitPerYear'] ?? 0,
    leaveUsedInYear: j['leaveUsedInYear'] ?? 0,
    leaveLeftInYear: j['leaveLeftInYear'] ?? 0,
    limitPerMonth: j['limitPerMonth'] ?? 0,
    leaveUsedInMonth: j['leaveUsedInMonth'] ?? 0,
    leaveLeftInMonth: j['leaveLeftInMonth'] ?? 0,
  );
}

/// Body tạo đơn
class LeaveRequestCreateInput {
  final String reason;
  final int receiverId;
  final LeaveType leaveType;
  final String? startDate; // yyyy-MM-dd
  final String? endDate;   // yyyy-MM-dd
  final List<String>? days; // MULTI
  final String? startTime; // HH:mm
  final String? endTime;   // HH:mm
  const LeaveRequestCreateInput({
    required this.reason,
    required this.receiverId,
    required this.leaveType,
    this.startDate,
    this.endDate,
    this.days,
    this.startTime,
    this.endTime,
  });

  Map<String, dynamic> toJson() => {
    'reason': reason,
    'receiverId': receiverId,
    'leaveType': leaveTypeTo(leaveType),
    'startDate': startDate,
    'endDate': endDate,
    'days': days,
    'startTime': startTime,
    'endTime': endTime,
  }..removeWhere((k,v) => v == null);
}
