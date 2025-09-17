import 'package:dio/dio.dart';
import 'package:mobile/services/api_service.dart';

class BankService {
  /// Lấy snapshot số dư hiện tại
  static Future<Response> getSnapshot() async {
    return ApiService.client.get("/accountant/bank/snapshot");
  }

  /// Lịch sử giao dịch ngân hàng
  static Future<Response> getHistory({
    String? fromDate, // yyyy-MM-dd
    String? toDate,   // yyyy-MM-dd
    int page = 1,
    int size = 20,
  }) async {
    return ApiService.client.get(
      "/accountant/bank/history",
      queryParameters: {
        if (fromDate != null) "fromDate": fromDate,
        if (toDate != null) "toDate": toDate,
        "page": page,
        "size": size,
      },
    );
  }

  /// Refresh snapshot
  static Future<Response> refresh() async {
    return ApiService.client.post("/accountant/bank/refresh");
  }

  /// Lấy giao dịch thô từ PaymentController (/accountant/bank-transactions)
  static Future<Response> getRawTransactions({
    String? type, // CREDIT | DEBIT
    int page = 1,
    int size = 20,
  }) async {
    return ApiService.client.get(
      "/accountant/bank-transactions",
      queryParameters: {
        if (type != null) "type": type,
        "page": page,
        "size": size,
      },
    );
  }
}
