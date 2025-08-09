import 'package:mobile/models/fund.dart';
import 'package:mobile/services/api_service.dart';

class FundService {
  static Future<(List<Fund>, int)> getFunds({
    String? name,
    String? status,
    DateTime? createdAfter,
    DateTime? createdBefore,
    double? balanceMin,
    double? balanceMax,
    int page = 0,
    int size = 10,
  }) async {
    try {
      final response = await ApiService.client.get(
        '/accountant/funds',
        queryParameters: {
          'name': name,
          'status': status,
          'createdAfter': createdAfter?.toIso8601String(),
          'createdBefore': createdBefore?.toIso8601String(),
          'balanceMin': balanceMin,
          'balanceMax': balanceMax,
          'page': page,
          'size': size,
        }..removeWhere((key, value) => value == null),
      );

      final data = response.data['data'];
      final List items = data['items'];
      final int total = data['totalItems'] ?? 0;

      final funds = items.map((e) => Fund.fromJson(e)).toList();

      return (funds, total);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Fund> getFundById(int id) async {
    final response = await ApiService.client.get('/accountant/funds/$id');
    final data = response.data['data'];
    return Fund.fromJson(data);
  }

  static Future<void> createFund(Map<String, dynamic> payload) async {
    await ApiService.client.post('/accountant/funds', data: payload);
  }

  static Future<void> updateFund(int id, Map<String, dynamic> payload) async {
    await ApiService.client.put('/accountant/funds/$id', data: payload);
  }

  static Future<Map<String, dynamic>> getFundSummary() async {
    final response = await ApiService.client.get('/accountant/funds/summary');
    return response.data['data'];
  }

  static Future<List<Map<String, dynamic>>> getFundHistory(int id) async {
    final response = await ApiService.client.get('/accountant/funds/$id/history');
    return List<Map<String, dynamic>>.from(response.data['data']);
  }
}
