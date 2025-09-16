import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/models/api_response.dart'; // 👈 import ApiResponse
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
        "type": type, // BE FundTransactionRequestDTO expect: type
        "amount": amount.toString(), // gửi string để tránh lỗi parse
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

  /// Lấy danh sách giao dịch theo quỹ
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

  /// Lấy tất cả giao dịch (có thể lọc)
  static Future<List<FundTransaction>> getAllTransactions({
    int? fundId,
    String? type,
    String? status,
    DateTime? createdFrom,
    DateTime? createdTo,
  }) async {
    final Map<String, dynamic> query = {
      if (fundId != null) 'fundId': fundId,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (createdFrom != null) 'createdFrom': createdFrom.toIso8601String(),
      if (createdTo != null) 'createdTo': createdTo.toIso8601String(),
    };

    final res = await ApiService.client.get(
      '/accountant/funds/transactions',
      queryParameters: query,
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
    final res = await ApiService.client.patch(
      '/accountant/funds/$fundId/transactions/$transactionId/approval',
      queryParameters: {
        'approve': approve,
        if (comment != null) 'comment': comment,
      },
    );
    return ApiResponse.fromJson(res.data);
  }
}
