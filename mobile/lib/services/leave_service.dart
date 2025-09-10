import 'package:dio/dio.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/leave_request.dart';
import 'package:mobile/models/account.dart';

class LeaveService {
  // ---------------- LIST & DETAIL ----------------

  /// GET /leave-requests?status=...&page=...&size=...
  /// Trả (items, totalPages)
  static Future<(List<LeaveRequest>, int)> getLeaveRequests({
    String? status,
    int page = 1,
    int size = 10,
  }) async {
    final res = await ApiService.client.get(
      '/leave-requests',
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status,
        'page': page,
        'size': size,
      },
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (res.statusCode != 200) {
      throw Exception(res.data?['message'] ?? 'server-is-busy');
    }

    final data = res.data['data'] as Map<String, dynamic>;
    final List raw = (data['items'] ?? data['documents'] ?? []) as List;
    final items = raw.map((e) => LeaveRequest.fromJson(e)).toList();

    // Đọc linh hoạt tên trường tổng trang
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
  /// body: {reason, receiverId, leaveType, startDate/endDate | days, startTime?, endTime?}
  static Future<void> create(Map<String, dynamic> body) async {
    final res = await ApiService.client.post(
      '/leave-requests',
      data: body,
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 201) {
      throw Exception(res.data?['message'] ?? 'Tạo đơn nghỉ phép thất bại');
    }
  }

  /// POST /leave-requests/{id}/approve  body: { "signature": base64 }
  static Future<void> approve(int id, {required String signatureBase64}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/approve',
      data: {'signature': signatureBase64},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) {
      throw Exception(res.data?['message'] ?? 'Duyệt đơn thất bại');
    }
  }

  /// POST /leave-requests/{id}/reject  body: { "rejectReason": reason }
  static Future<void> reject(int id, {required String reason}) async {
    final res = await ApiService.client.post(
      '/leave-requests/$id/reject',
      data: {'rejectReason': reason},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) {
      throw Exception(res.data?['message'] ?? 'Từ chối đơn thất bại');
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
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'Xác nhận HR thất bại');
  }

  // ---------------- BANNERS ----------------

  /// GET /leave-requests/my-pending
  static Future<List<LeaveRequest>> getMyPending() async {
    final res = await ApiService.client.get(
      '/leave-requests/my-pending',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => LeaveRequest.fromJson(e)).toList();
  }

  /// GET /leave-requests/pending-to-approve
  static Future<List<LeaveRequest>> getPendingToApprove() async {
    final res = await ApiService.client.get(
      '/leave-requests/pending-to-approve',
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'server-is-busy');
    final list = res.data['data'] as List? ?? [];
    return list.map((e) => LeaveRequest.fromJson(e)).toList();
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
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    if (res.statusCode != 200) throw Exception(res.data?['message'] ?? 'Lưu chữ ký thất bại');
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
