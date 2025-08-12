import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/attendance_model.dart';
import 'package:http_parser/http_parser.dart';
import 'package:intl/intl.dart';
class AttendanceService {
  // CHECK-IN: gửi đúng key 'image'
  static Future<Attendance> checkInFace({
    required int accountId,
    required File imageFile,
    required double latitude,
    required double longitude,
  }) async {
    final formData = FormData.fromMap({
      'accountId': accountId,
      'image': await MultipartFile.fromFile(
        imageFile.path,
        filename: 'live.jpg',
        contentType: MediaType('image', 'jpeg'),
      ),
      'latitude': latitude,
      'longitude': longitude,
    });

    try {
      final res = await ApiService.client.post(
        '/attendance/check-in',
        data: formData,
        options: Options(validateStatus: (c) => c != null && c < 500),
      );

      if (res.statusCode != 200 && res.statusCode != 201) {
        final msg = (res.data is Map ? res.data['message']?.toString() : null)
            ?? 'Check-in failed (${res.statusCode})';
        throw msg;
      }

      final data = res.data is Map && res.data['data'] != null ? res.data['data'] : res.data;
      return Attendance.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response?.data['message']?.toString() : e.message;
      throw msg ?? 'Network error';
    }
  }

  // CHECK-OUT: cũng gửi 'image' + lat/long
  static Future<Attendance> checkOutFace({
    required int accountId,
    required File imageFile,
    required double latitude,
    required double longitude,
  }) async {
    final formData = FormData.fromMap({
      'accountId': accountId,
      'image': await MultipartFile.fromFile(
        imageFile.path,
        filename: 'live.jpg',
        contentType: MediaType('image', 'jpeg'),
      ),
      'latitude': latitude,
      'longitude': longitude,
    });

    try {
      final res = await ApiService.client.post(
        '/attendance/check-out',
        data: formData,
        options: Options(validateStatus: (c) => c != null && c < 500),
      );

      if (res.statusCode != 200 && res.statusCode != 201) {
        final msg = (res.data is Map ? res.data['message']?.toString() : null)
            ?? 'Check-out failed (${res.statusCode})';
        throw msg;
      }

      final data = res.data is Map && res.data['data'] != null ? res.data['data'] : res.data;
      return Attendance.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response?.data['message']?.toString() : e.message;
      throw msg ?? 'Network error';
    }
  }

  // Lấy danh sách attendance cá nhân (phân trang)
  static Future<(List<Attendance>, int)> getMyAttendancePage({
    int page = 1,
    int pageSize = 10,
    String? statusFilter,
    String? searchTerm,
    String? sortBy = "desc",
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final payload = {
      "pageNumber": page,
      "pageSize": pageSize,
      "statusFilter": statusFilter,
      "searchTerm": searchTerm,
      "sortBy": sortBy,
      "fromDate": fromDate != null ? DateFormat('yyyy-MM-dd').format(fromDate) : null,
      "toDate": toDate != null ? DateFormat('yyyy-MM-dd').format(toDate) : null,
    };

    final response = await ApiService.client.post(
      '/attendance/get-my-attendance',
      data: payload,
    );

    final data = response.data['data'];
    final list = data['attendances'] as List;
    final totalPage = data['totalPage'] as int;

    final result = list.map((json) => Attendance.fromJson(json)).toList();

    return (result, totalPage);
  }

  // Lấy chi tiết chấm công theo ID
  static Future<Attendance> getAttendanceById(int attendanceId) async {
    final response = await ApiService.client.get('/attendance/$attendanceId');
    return Attendance.fromJson(response.data);
  }

  // Lấy trạng thái chấm công trong ngày
  static Future<String> getTodayStatus(int accountId) async {
    final response = await ApiService.client.get(
      '/attendance/today-status',
      queryParameters: {'accountId': accountId},
    );
    return response.data; // Trả về: "NOT_CHECKED_IN", "CHECKED_IN", "CHECKED_OUT"
  }

  // Lấy danh sách thiếu check-out theo ngày
  static Future<List<Attendance>> getMissingCheckOut({String? fromDate, String? toDate}) async {
    final query = {
      if (fromDate != null) 'fromDate': fromDate,
      if (toDate != null) 'toDate': toDate,
    };

    final response = await ApiService.client.get(
      '/attendance/missing-checkout',
      queryParameters: query,
    );

    final List data = response.data;
    return data.map((json) => Attendance.fromJson(json)).toList();
  }

  // Gửi ghi chú giải trình thiếu check-out
  static Future<Attendance> submitMissingCheckOutNote({
    required int attendanceId,
    required String note,
  }) async {
    final form = FormData.fromMap({
      'attendanceId': attendanceId.toString(),
      'note': note,
    });

    final response = await ApiService.client.post(
      '/attendance/submit-missing-checkout-note',
      data: form,
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );

    return Attendance.fromJson(response.data);
  }

  // HR duyệt hoặc từ chối giải trình thiếu check-out
  static Future<Attendance> resolveMissingCheckOut({
    required int attendanceId,
    required String note,
    required bool approved,
  }) async {
    final form = FormData.fromMap({
      'attendanceId': attendanceId.toString(),
      'note': note,
      'approved': approved.toString(),
    });

    final response = await ApiService.client.post(
      '/attendance/resolve-missing-checkout',
      data: form,
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );

    return Attendance.fromJson(response.data);
  }
}
