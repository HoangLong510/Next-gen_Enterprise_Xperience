import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mobile/models/transaction.dart';
import 'api_service.dart';

class TransactionService {
  // Tạo giao dịch mới
    static Future<String> createTransaction({
    required int fundId,
    required String type,
    required double amount,
    String? note,
    File? file,
  }) async {
    try {
      final response = await ApiService.client.post(
        '/transactions',
        data: {
          'fundId': fundId,
          'type': type,
          'amount': amount,
          'note': note,
          'file': file != null ? await MultipartFile.fromFile(file.path) : null,
        },
      );

      if (response.statusCode == 200) {
        return response.data['message']; // Assuming your API returns a message in the 'message' field
      } else {
        throw Exception('Error: ${response.data['message']}');
      }
    } catch (e) {
      throw Exception('Failed to create transaction: $e');
    }
  }

 static Future<List<FundTransaction>> getTransactionsByFund(int fundId) async {
    final res = await ApiService.client.get('/accountant/funds/$fundId/transactions');
    
    if (res.data['status'] == 200) {
      final List data = res.data['data']; 
      return data.map((json) => FundTransaction.fromJson(json)).toList(); 
    } else {
      throw Exception('Failed to load transactions: ${res.data['message']}');
    }
  }

  //  Lấy tất cả giao dịch (lọc tùy chọn)
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

    final res = await ApiService.client.get('/accountant/funds/transactions', queryParameters: query);
    final List data = res.data['data'];
    return data.map((json) => FundTransaction.fromJson(json)).toList();
  }

  // Duyệt hoặc từ chối giao dịch
  static Future<void> approveTransaction({
    required int fundId,
    required int transactionId,
    required bool approve,
    String? comment,
  }) async {
    await ApiService.client.patch(
      '/accountant/funds/$fundId/transactions/$transactionId/approval',
      queryParameters: {
        'approve': approve,
        if (comment != null) 'comment': comment,
      },
    );
  }
}
