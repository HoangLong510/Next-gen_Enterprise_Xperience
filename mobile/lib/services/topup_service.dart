import 'package:dio/dio.dart';
import 'package:mobile/services/api_service.dart';

class TopupService {
  /// Tạo topup (bulk / perEmployee)
  static Future<Response> createTopup(Map<String, dynamic> payload) async {
    return ApiService.client.post(
      "/payments/topups/bulk",
      data: payload,
    );
  }

  /// Lấy danh sách topups của user (scope = created | owner | null)
  static Future<Response> getTopups({
    String? scope,
    int page = 1,
    int size = 10,
  }) async {
    return ApiService.client.get(
      "/payments/topups",
      queryParameters: {
        if (scope != null) "scope": scope,
        "page": page,
        "size": size,
      },
    );
  }

  /// Lấy trạng thái topup theo code
  static Future<Response> getTopupStatus(String code) async {
    return ApiService.client.get("/payments/topups/status/$code");
  }

  /// Lấy QR cho mã topup
  static Future<Response> getTopupQr(String code) async {
    return ApiService.client.get("/payments/topups/$code/qr");
  }
}
