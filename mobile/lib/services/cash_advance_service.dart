import 'package:dio/dio.dart';
import 'package:mobile/models/cash_advance.dart';
import 'package:mobile/models/api_response.dart';
import 'api_service.dart';

class CashAdvanceService {
  static const String baseUrl = "/cash-advances";

  /// ================== Queries ==================

  /// Lấy danh sách của tôi
  static Future<List<CashAdvance>> getMyCashAdvances() async {
    final res = await ApiService.client.get("$baseUrl/my");
    final apiRes = ApiResponse.fromJson(res.data);

    if (apiRes.status == 200 && apiRes.data != null) {
      final List<dynamic> list = apiRes.data;
      return list.map((e) => CashAdvance.fromJson(e)).toList();
    } else {
      throw Exception(apiRes.message ?? "Failed to load cash advances");
    }
  }

  /// Lấy danh sách chung (có thể filter theo status, scope)
  static Future<List<CashAdvance>> listAdvances({
    String? status,
    String? scope,
  }) async {
    final res = await ApiService.client.get(
      baseUrl,
      queryParameters: {
        if (status != null) "status": status,
        if (scope != null) "scope": scope,
      },
    );
    final apiRes = ApiResponse.fromJson(res.data);

    if (apiRes.status == 200 && apiRes.data != null) {
      final List<dynamic> list = apiRes.data;
      return list.map((e) => CashAdvance.fromJson(e)).toList();
    } else {
      throw Exception(apiRes.message ?? "Failed to load cash advances");
    }
  }

  /// ================== Create ==================

  /// Tạo đề nghị tạm ứng đơn giản
  static Future<ApiResponse> createCashAdvanceSimple({
    required int taskId,
    required double amount,
    String? reason,
  }) async {
    final formData = FormData.fromMap({
      "taskId": taskId.toString(),
      "amount": amount.toString(),
      if (reason != null) "reason": reason,
    });

    final res = await ApiService.client.post(
      "$baseUrl/simple",
      data: formData,
      options: Options(contentType: "multipart/form-data"),
    );

    return ApiResponse.fromJson(res.data);
  }

  /// Tạo đề nghị tạm ứng đầy đủ (payload JSON trong multipart)
  static Future<ApiResponse> createCashAdvanceFull(
      Map<String, dynamic> payload) async {
    final formData = FormData.fromMap({
      "payload": MultipartFile.fromString(
        payload.toString(), // 👉 nếu muốn chuẩn JSON thì jsonEncode(payload)
        filename: "payload.json",
      ),
    });

    final res = await ApiService.client.post(
      baseUrl,
      data: formData,
    );
    return ApiResponse.fromJson(res.data);
  }

  /// ================== Decisions per role ==================

  /// Quyết định của accountant
  static Future<ApiResponse> accountantDecision({
    required int id,
    required bool approve,
    String? note,
  }) async {
    final res = await ApiService.client.post(
      "$baseUrl/$id/accountant-decision",
      data: {
        "approve": approve,
        if (note != null) "note": note,
      },
    );
    return ApiResponse.fromJson(res.data);
  }

  /// Quyết định của chief accountant
  static Future<ApiResponse> chiefDecision({
    required int id,
    required bool approve,
    String? note,
    String? signatureDataUrl,
  }) async {
    final res = await ApiService.client.post(
      "$baseUrl/$id/chief-decision",
      data: {
        "approve": approve,
        if (note != null) "note": note,
        if (signatureDataUrl != null) "signatureDataUrl": signatureDataUrl,
      },
    );
    return ApiResponse.fromJson(res.data);
  }

  /// Quyết định của director
  static Future<ApiResponse> directorDecision({
    required int id,
    required bool approve,
    String? note,
    String? signatureDataUrl,
  }) async {
    final res = await ApiService.client.post(
      "$baseUrl/$id/director-decision",
      data: {
        "approve": approve,
        if (note != null) "note": note,
        if (signatureDataUrl != null) "signatureDataUrl": signatureDataUrl,
      },
    );
    return ApiResponse.fromJson(res.data);
  }
}
