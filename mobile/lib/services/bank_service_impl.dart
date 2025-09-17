import 'package:dio/dio.dart';
import 'package:mobile/models/bank/bank_tx_row.dart';
import 'package:mobile/models/bank/topup_intent.dart';
import 'package:mobile/models/bank/topup_row.dart';
import 'package:mobile/models/bank/topup_status.dart';
import 'package:mobile/services/api_service.dart';

class BankServiceImpl {
  final Dio _dio = ApiService.client;

  /* ----------------- Helpers ----------------- */
  TopupStatus _statusFrom(dynamic v) {
    final s = (v?.toString() ?? '').toUpperCase();
    return TopupStatus.values.firstWhere(
      (e) => e.name.toUpperCase() == s,
      orElse: () => TopupStatus.PENDING,
    );
  }

  DateTime? _dt(v) => v == null ? null : DateTime.tryParse(v.toString());

  TopupIntent _intentFromJson(Map<String, dynamic> j) {
    return TopupIntent(
      code: j['code']?.toString() ?? '',
      amount: (j['amount'] is num)
          ? (j['amount'] as num).toDouble()
          : double.tryParse('${j['amount']}') ?? 0,
      bankAccountNo: j['bankAccountNo']?.toString() ?? '',
      status: _statusFrom(j['status']),
      sepayRefId: j['sepayRefId']?.toString(),
      createdAt: _dt(j['createdAt']),
      completedAt: _dt(j['completedAt']),
      owner: j['owner'] != null
          ? TopupOwner.fromJson(Map<String, dynamic>.from(j['owner']))
          : null,
    );
  }

  TopupRow _rowFromJson(Map<String, dynamic> j) {
    return TopupRow(
      id: int.tryParse('${j['id']}'),
      code: j['code']?.toString() ?? '',
      amount: (j['amount'] is num)
          ? (j['amount'] as num).toDouble()
          : double.tryParse('${j['amount']}') ?? 0,
      bankAccountNo: j['bankAccountNo']?.toString(),
      status: _statusFrom(j['status']),
      sepayRefId: j['sepayRefId']?.toString(),
      createdAt: _dt(j['createdAt']),
      completedAt: _dt(j['completedAt']),
      owner: j['owner'] != null
          ? TopupOwner.fromJson(Map<String, dynamic>.from(j['owner']))
          : null,
    );
  }

  BankTxRow _txFromJson(Map<String, dynamic> j) {
    return BankTxRow(
      refId: j['refId']?.toString() ?? '',
      type: j['type']?.toString() ?? 'CREDIT',
      amount: (j['amount'] is num)
          ? (j['amount'] as num).toDouble()
          : double.tryParse('${j['amount']}') ?? 0,
      description: j['description']?.toString(),
      counterAccountNo: j['counterAccountNo']?.toString(),
      txTime: _dt(j['txTime']),
    );
  }

  /* ----------------- BANK API ----------------- */

  /// Snapshot số dư hiện tại
  Future<Map<String, dynamic>> getSnapshot() async {
    final res = await _dio.get('/accountant/bank/snapshot');
    return res.data['data'] ?? res.data;
  }

  /// Lịch sử giao dịch
  Future<({List<BankTxRow> rows, int totalPages})> getBankTransactions({
    int page = 1,
    int size = 20,
    String? fromIso,
    String? toIso,
  }) async {
    final qp = <String, dynamic>{'page': page, 'size': size};
    if (fromIso != null && fromIso.isNotEmpty) qp['fromDate'] = fromIso;
    if (toIso != null && toIso.isNotEmpty) qp['toDate'] = toIso;

    final res = await _dio.get('/accountant/bank/history', queryParameters: qp);
    final data = res.data['data'] ?? res.data;

    final content =
        (data is Map && data['content'] is List) ? data['content'] as List : <dynamic>[];
    final total =
        (data is Map && data['totalPages'] != null) ? int.tryParse('${data['totalPages']}') ?? 1 : 1;

    final rows = content.map((e) => _txFromJson(Map<String, dynamic>.from(e))).toList();
    return (rows: rows, totalPages: total);
  }

  /// Đồng bộ lại số dư Fund
  Future<Map<String, dynamic>> refreshBank() async {
    final res = await _dio.post('/accountant/bank/refresh');
    return res.data['data'] ?? res.data;
  }

  /* ----------------- TOPUP API ----------------- */

  Future<List<TopupIntent>> createTopup({
    required double amount,
    required String bankAccountNo,
    bool perEmployee = false,
    List<int>? employeeIds,
    int copies = 1,
  }) async {
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
  }

  Future<TopupIntent> getTopupStatus(String code) async {
    final safe = Uri.encodeComponent(code);
    final res = await _dio.get('/payments/topups/status/$safe');
    final data = res.data['data'] ?? res.data;
    return _intentFromJson(Map<String, dynamic>.from(data));
  }

  Future<String?> getTopupQrUrl(String code) async {
    final safe = Uri.encodeComponent(code);
    final res = await _dio.get('/payments/topups/$safe/qr');
    final data = res.data['data'] ?? res.data;
    return (data is Map) ? data['qrImageUrl']?.toString() : null;
  }

  Future<({List<TopupRow> rows, int totalPages})> getMyTopups({
    int page = 1,
    int size = 20,
    String? scope,
  }) async {
    final res = await _dio.get(
      '/payments/topups',
      queryParameters: {'page': page, 'size': size, if (scope != null) 'scope': scope},
    );
    final data = res.data['data'] ?? res.data;
    final content =
        (data is Map && data['content'] is List) ? data['content'] as List : (data as List? ?? []);
    final total =
        (data is Map && data['totalPages'] != null) ? int.tryParse('${data['totalPages']}') ?? 1 : 1;

    final rows = content.map((e) => _rowFromJson(Map<String, dynamic>.from(e))).toList();
    return (rows: rows, totalPages: total);
  }
}
