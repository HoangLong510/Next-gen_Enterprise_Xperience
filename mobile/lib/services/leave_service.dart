import 'package:dio/dio.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/leave_request.dart';
import 'package:mobile/models/account.dart';

class LeaveService {
  // (VN) Helper: coi 200/201/204 là thành công
  static bool _ok(int? code) => code == 200 || code == 201 || code == 204;

  // ---------------- LIST & DETAIL ----------------

  /// GET /leave-requests?status=&page=&size=&departmentId=&departmentName=&senderName=&date=&month=
  /// Trả về (items, totalPages)
  static Future<(List<LeaveRequest>, int)> getLeaveRequests({
    String? status,
    int page = 1,
    int size = 10,
    int? departmentId,
    String? departmentName,
    String? senderName,
    String? date,  // yyyy-MM-dd
    String? month, // yyyy-MM
  }) async {
    final qp = <String, dynamic>{
      if (status != null && status.isNotEmpty) 'status': status,
      'page': page,
      'size': size,
      if (departmentId != null) 'departmentId': departmentId,
      if (departmentName != null && departmentName.isNotEmpty) 'departmentName': departmentName,
      if (senderName != null && senderName.isNotEmpty) 'senderName': senderName,
      if (date != null && date.isNotEmpty) 'date': date,
      if (month != null && month.isNotEmpty) 'month': month,
    };

    final res = await ApiService.client.get(
      '/leave-requests',
      queryParameters: qp,
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (res.statusCode != 200) {
      throw Exception(res.data?['message'] ?? 'server-is-busy');
    }

    final data = res.data['data'] as Map<String, dynamic>;
    final List raw = (data['items'] ?? data['documents'] ?? []) as List;
    final items = raw.map((e) => LeaveRequest.fromJson(e)).toList();

    final totalPagesAny = data['totalPages'] ?? data['totalPage'] ?? data['total_pages'] ?? 1;
    final totalPages = (totalPagesAny as num).toInt();

    return (items, totalPages);
  }

  /// GET /leave-requests/{id}
  static Future<LeaveRequest> getDetail(int id) async {
    final res = await ApiService.client.get('/leave-requests/$id');
    if (res.statusCode != 200) {
      throw Exception(res.data?['message'] ?? 'server-is-busy');
    }
    return LeaveRequest.fromJson(res.data['data']);
  }

  // ---------------- CREATE / APPROVE / REJECT ----------------

  /// POST /leave-requests
  /// body: {reason, receiverId?, leaveType, startDate/endDate | days, startTime?, endTime?}
  static Future<void> create(Map<String, dynamic> body) async {
    final res = await ApiService.client.post(
      '/leave-requests',
      data: body,
      options: Options(
        headers: {'Content-Type': 'application/json'},
        // (VN) Tự xử lý status thay vì để Dio throw
        validateStatus: (_) => true,
      ),
    );
    final code = res.statusCode ?? 0;
    if (_ok(code)) {
      // (VN) 200/201/204 đều coi là thành công
      return;
    }
    throw Exception(res.data?['message'] ?? 'Tạo đơn nghỉ phép thất bại (HTTP $code)');
  }

  /// POST /leave-requests/{id}/approve  body: { "signature": base64 }
  static Future<void> approve(int id, {required String signatureBase64}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/approve',
      data: {'signature': signatureBase64},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'Duyệt đơn thất bại (HTTP ${res.statusCode})');
    }
  }

  /// POST /leave-requests/{id}/reject  body: { "rejectReason": reason }
  static Future<void> reject(int id, {required String reason}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/reject',
      data: {'rejectReason': reason},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'Từ chối đơn thất bại (HTTP ${res.statusCode})');
    }
  }

  // ---------------- HR FLOW ----------------

  /// GET /leave-requests/pending-hr
  static Future<List<LeaveRequest>> getPendingHr() async {
    final res = await ApiService.client.get(
      '/leave-requests/pending-hr',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => LeaveRequest.fromJson(e)).toList();
  }

  /// POST /leave-requests/{id}/hr-confirm (no body)
  static Future<void> hrConfirm(int id) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/hr-confirm',
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'Xác nhận HR thất bại (HTTP ${res.statusCode})');
    }
  }

  /// POST /leave-requests/{id}/hr-reject  body: { rejectReason? }
  static Future<void> hrReject(int id, {String? reason}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/hr-reject',
      data: reason == null ? null : {'rejectReason': reason},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'HR từ chối thất bại (HTTP ${res.statusCode})');
    }
  }

  /// POST /leave-requests/{id}/hr-cancel  (no body)
  static Future<void> hrCancel(int id) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/hr-cancel',
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'HR hủy đơn thất bại (HTTP ${res.statusCode})');
    }
  }

  // ---------------- CANCEL REQUEST (Employee) ----------------

  /// POST /leave-requests/{id}/cancel-request  body: { reason }
  static Future<void> requestCancel(int id, {required String reason}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/cancel-request',
      data: {'reason': reason},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'Gửi yêu cầu hủy thất bại (HTTP ${res.statusCode})');
    }
  }

  // ---------------- BANNERS / COUNTS ----------------

  /// GET /leave-requests/my-pending (đơn mình gửi nhưng chưa được duyệt)
  static Future<List<LeaveRequest>> getMyPending() async {
    final res = await ApiService.client.get(
      '/leave-requests/my-pending',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => LeaveRequest.fromJson(e)).toList();
  }

  /// Alias để khớp tên gọi trên web
  static Future<List<LeaveRequest>> getMyPendingSent() => getMyPending();

  /// GET /leave-requests/pending-to-approve (đơn chờ tôi duyệt)
  static Future<List<LeaveRequest>> getPendingToApprove() async {
    final res = await ApiService.client.get(
      '/leave-requests/pending-to-approve',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => LeaveRequest.fromJson(e)).toList();
  }

  /// GET /leave-requests/my-expired-count?month=yyyy-MM
  static Future<int> getMyExpiredCount({String? month}) async {
    final m = month ?? DateTime.now().toIso8601String().substring(0, 7); // yyyy-MM
    final res = await ApiService.client.get(
      '/leave-requests/my-expired-count',
      queryParameters: {'month': m},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final data = res.data['data'];
    if (data is num) return data.toInt();
    if (data is String) return int.tryParse(data) ?? 0;
    return 0;
    }

  // ---------------- EXPORT ----------------

  /// GET /leave-requests/{id}/export-word  (bytes)
  static Future<Response<List<int>>> downloadWord(int id) async {
    final res = await ApiService.client.get<List<int>>(
      '/leave-requests/$id/export-word',
      options: Options(
        responseType: ResponseType.bytes,
        headers: {'Content-Type': 'application/json'},
      ),
    );
    return res;
  }

  // ---------------- BUSY DAYS & BALANCE ----------------

  /// GET /leave-requests/busy-days?departmentId=...&month=yyyy-MM
  static Future<List<dynamic>> getBusyDays({
    required int departmentId,
    required String month, // yyyy-MM
  }) async {
    final res = await ApiService.client.get(
      '/leave-requests/busy-days',
      queryParameters: {'departmentId': departmentId, 'month': month},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    return (res.data['data'] as List?) ?? [];
  }

  /// GET /leave-requests/leave-balance?month=yyyy-MM
  static Future<Map<String, dynamic>?> getLeaveBalance(String month) async {
    final res = await ApiService.client.get(
      '/leave-requests/leave-balance',
      queryParameters: {'month': month},
    );
    if (res.statusCode != 200) return null;
    return (res.data['data'] as Map?)?.cast<String, dynamic>();
  }

  // ---------------- SIGNATURE SAMPLE ----------------

  /// GET /leave-requests/my-signature-sample  -> base64 string hoặc null
  static Future<String?> getMySignatureSample() async {
    final res = await ApiService.client.get(
      '/leave-requests/my-signature-sample',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) return null;
    return res.data['data'] as String?;
  }

  /// POST /leave-requests/my-signature-sample  body: {signatureBase64}
  static Future<void> saveMySignatureSample(String signatureBase64) async {
    final res = await ApiService.client.post(
      '/leave-requests/my-signature-sample',
      data: {'signatureBase64': signatureBase64},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (_) => true,
      ),
    );
    if (!_ok(res.statusCode)) {
      throw Exception(res.data?['message'] ?? 'Lưu chữ ký thất bại (HTTP ${res.statusCode})');
    }
  }

  // ---------------- ACCOUNTS ----------------

  /// GET /accounts/by-roles?roles=HOD&roles=MANAGER...
  static Future<List<Account>> getAccountsByRoles(List<String> roles) async {
    final query = roles.map((r) => 'roles=$r').join('&');
    final res = await ApiService.client.get('/accounts/by-roles?$query');
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => Account.fromJson(e)).toList();
  }

  /// Helper để giữ tương thích với code cũ
  static Future<List<Account>> fetchAccountsByRole(String role) {
    return getAccountsByRoles([role]);
  }
}
