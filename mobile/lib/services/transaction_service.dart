import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/models/api_response.dart';
import 'api_service.dart';

class TransactionService {
  /// Tạo giao dịch mới
  static Future<ApiResponse> createTransaction({
    required int fundId,
    required String type,
    required double amount,
    String? note,
    File? file,
  }) async {
    try {
      final formData = FormData.fromMap({
        "type": type,
        "amount": amount.toString(),
        if (note != null) "note": note,
        if (file != null) "file": await MultipartFile.fromFile(file.path),
      });

      final response = await ApiService.client.post(
        '/accountant/funds/$fundId/transactions',
        data: formData,
        options: Options(contentType: "multipart/form-data"),
      );

      return ApiResponse.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to create transaction: $e');
    }
  }

  /// Lấy giao dịch theo quỹ
  static Future<List<FundTransaction>> getTransactionsByFund(int fundId) async {
    final res = await ApiService.client.get(
      '/accountant/funds/$fundId/transactions',
    );

    final apiRes = ApiResponse.fromJson(res.data);
    if (apiRes.status == 200 && apiRes.data != null) {
      final List<dynamic> list = apiRes.data;
      return list.map((e) => FundTransaction.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load transactions: ${apiRes.message}');
    }
  }

  /// Lấy tất cả giao dịch (filter optional)
  static Future<List<FundTransaction>> getAllTransactions({
    Map<String, dynamic>? filters,
  }) async {
    // Xoá key nào value rỗng/null để tránh query thừa
    final params = <String, dynamic>{};
    if (filters != null) {
      filters.forEach((key, value) {
        if (value != null && value.toString().isNotEmpty) {
          params[key] = value.toString();
        }
      });
    }

    final res = await ApiService.client.get(
      '/accountant/funds/transactions',
      queryParameters: params,
    );

    final apiRes = ApiResponse.fromJson(res.data);
    if (apiRes.status == 200 && apiRes.data != null) {
      final List<dynamic> list = apiRes.data;
      return list.map((e) => FundTransaction.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load transactions: ${apiRes.message}');
    }
  }

  /// Duyệt hoặc từ chối giao dịch
  static Future<ApiResponse> approveTransaction({
    required int fundId,
    required int transactionId,
    required bool approve,
    String? comment,
  }) async {
    final formData = FormData.fromMap({
      "approve": approve,
      if (comment != null) "comment": comment,
    });

    final res = await ApiService.client.patch(
      '/accountant/funds/$fundId/transactions/$transactionId/approval',
      data: formData,
      options: Options(contentType: "multipart/form-data"),
    );

    return ApiResponse.fromJson(res.data);
  }
}
