import 'package:dio/dio.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/models/bank/bank_tx.dart';
import 'package:mobile/models/bank/topup_intent.dart';
import 'package:mobile/models/bank/topup_row.dart';
import 'package:mobile/models/bank/topup_status.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/services/bank_service.dart';

/* ---------- mappers ---------- */
TopupStatus _statusFrom(dynamic v) {
  final s = (v?.toString() ?? '').toUpperCase();
  return TopupStatus.values.firstWhere(
    (e) => e.name.toUpperCase() == s,
    orElse: () => TopupStatus.PENDING,
  );
}

TopupIntent _intentFromJson(Map<String, dynamic> j) {
  DateTime? _dt(v) => v == null ? null : DateTime.tryParse(v.toString());
  return TopupIntent(
    code: j['code']?.toString() ?? '',
    amount: int.tryParse('${j['amount']}') ?? 0,
    bankAccountNo: j['bankAccountNo']?.toString() ?? '',
    status: _statusFrom(j['status']),
    createdAt: _dt(j['createdAt']) ?? DateTime.now(),
    completedAt: _dt(j['completedAt']),
  );
}

TopupRow _rowFromJson(Map<String, dynamic> j) {
  DateTime? _dt(v) => v == null ? null : DateTime.tryParse(v.toString());
  Account? _owner() {
    final o = j['owner'];
    if (o is Map) return Account.fromJson(Map<String, dynamic>.from(o));
    return null;
  }

  return TopupRow(
    id: int.tryParse('${j['id']}'),
    code: j['code']?.toString() ?? '',
    amount: int.tryParse('${j['amount']}') ?? 0,
    bankAccountNo: j['bankAccountNo']?.toString(),
    status: _statusFrom(j['status']),
    completedAt: _dt(j['completedAt']),
    createdAt: _dt(j['createdAt']),
    owner: _owner(),
  );
}

BankTx _txFromJson(Map<String, dynamic> j) {
  DateTime? _dt(v) => v == null ? null : DateTime.tryParse(v.toString());
  final type = (j['type']?.toString().toUpperCase() == 'DEBIT') ? 'DEBIT' : 'CREDIT';
  return BankTx(
    refId: j['refId']?.toString() ?? '',
    type: type,
    amount: int.tryParse('${j['amount']}') ?? 0,
    description: j['description']?.toString(),
    counterAccountNo: j['counterAccountNo']?.toString(),
    txTime: _dt(j['txTime']),
  );
}

/* ---------- implementation ---------- */
class BankServiceImpl implements BankService {
  final Dio _dio = ApiService.client;

  @override
  Future<List<Account>> searchEmployees(String keyword, {int limit = 50}) async {
    try {
      // Đổi path này đúng BE thực tế
      final res = await _dio.get(
        '/projects/employees/search',
        queryParameters: {'q': keyword, 'limit': limit},
      );
      final data = res.data['data'] ?? res.data;
      final list = (data is List)
          ? data
          : (data is Map && data['content'] is List ? data['content'] : <dynamic>[]);

      return list.map<Account>((e) => Account.fromJson(Map<String, dynamic>.from(e))).toList();
    } on DioException {
      return [];
    }
  }

  @override
  Future<List<TopupIntent>> createTopup({
    required int amount,
    required String bankAccountNo,
    bool perEmployee = false,
    List<int>? employeeIds,
    int copies = 1,
  }) async {
    try {
      final payload = {
        'amount': amount,
        'bankAccountNo': bankAccountNo,
        'perEmployee': perEmployee,
        'copies': copies,
        if (perEmployee) 'employeeIds': employeeIds ?? [],
      };
      final res = await _dio.post(
        '/payments/topups/bulk',
        data: payload,
        options: Options(headers: {'Content-Type': 'application/json'}),
      );
      final data = res.data['data'] ?? res.data;

      final items = (data is Map && data['items'] is List) ? data['items'] : (data as List?);
      if (items is List) {
        return items.map((e) => _intentFromJson(Map<String, dynamic>.from(e))).toList();
      }
      return [_intentFromJson(Map<String, dynamic>.from(data as Map))];
    } on DioException catch (e) {
      throw Exception(e.response?.data ?? 'createTopup failed');
    }
  }

  @override
  Future<TopupIntent> getTopupStatus(String code) async {
    try {
      final safe = Uri.encodeComponent(code);
      final res = await _dio.get('/payments/topups/status/$safe');
      final data = res.data['data'] ?? res.data;
      return _intentFromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw Exception(e.response?.data ?? 'getTopupStatus failed');
    }
  }

  @override
  Future<String?> getTopupQrUrl(String code) async {
    try {
      final safe = Uri.encodeComponent(code);
      final res = await _dio.get('/payments/topups/$safe/qr');
      final data = res.data['data'] ?? res.data;
      return (data is Map) ? data['qrImageUrl']?.toString() : null;
    } on DioException {
      return null;
    }
  }

  @override
  Future<({List<TopupRow> rows, int totalPages})> getMyTopups({
    required int page,
    required int size,
    required String scope,
  }) async {
    try {
      final res = await _dio.get(
        '/payments/topups',
        queryParameters: {'page': page, 'size': size, 'scope': scope},
      );
      final data = res.data['data'] ?? res.data;
      final content = (data is Map && data['content'] is List) ? data['content'] as List : (data as List? ?? []);
      final total = (data is Map && data['totalPages'] != null) ? int.tryParse('${data['totalPages']}') ?? 1 : 1;

      final rows = content.map((e) => _rowFromJson(Map<String, dynamic>.from(e))).toList();
      return (rows: rows, totalPages: total);
    } on DioException catch (e) {
      throw Exception(e.response?.data ?? 'getMyTopups failed');
    }
  }

  @override
  Future<({List<BankTx> rows, int totalPages})> getBankTransactions({
    required int page,
    required int size,
    String? type,
    String? fromIso,
    String? toIso,
  }) async {
    try {
      final qp = <String, dynamic>{'page': page, 'size': size};
      if (fromIso != null && fromIso.isNotEmpty) qp['fromDate'] = fromIso;
      if (toIso != null && toIso.isNotEmpty) qp['toDate'] = toIso;
      if (type != null && type.isNotEmpty) qp['type'] = type;

      final res = await _dio.get('/accountant/bank/history', queryParameters: qp);
      final data = res.data['data'] ?? res.data;

      final content = (data is Map && data['content'] is List) ? data['content'] as List : (data as List? ?? []);
      final total = (data is Map && data['totalPages'] != null) ? int.tryParse('${data['totalPages']}') ?? 1 : 1;

      final rows = content.map((e) => _txFromJson(Map<String, dynamic>.from(e))).toList();
      return (rows: rows, totalPages: total);
    } on DioException catch (e) {
      throw Exception(e.response?.data ?? 'getBankTransactions failed');
    }
  }
}
