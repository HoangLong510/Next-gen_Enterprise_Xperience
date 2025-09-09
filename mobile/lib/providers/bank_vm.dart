import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/models/bank/bank_tx.dart';
import 'package:mobile/models/bank/topup_intent.dart';
import 'package:mobile/models/bank/topup_row.dart';
import 'package:mobile/models/bank/topup_status.dart';
import 'package:mobile/services/bank_service.dart';

class BankVm extends ChangeNotifier {
  BankVm(this.api, {required this.isAccountant});
  final BankService api;
  final bool isAccountant;

  // config
  final String bankAccountNo = '65609062003';
  final String bankName = 'TPBank';

  // create topup
  bool multiMode = true;
  bool creating = false;
  String amountText = '';
  List<Account> employeeOptions = [];
  List<Account> selectedEmployees = [];
  bool fetchingEmp = false;

  TopupIntent? singleIntent;
  String? singleQrUrl;
  bool polling = false;
  Timer? _pollTimer;
  List<TopupIntent> generatedList = [];

  // topups list
  int topupPage = 1, topupTotalPages = 1;
  bool loadingTopups = false;
  List<TopupRow> topups = [];

  // bank tx
  String txType = '';
  String fromIso = '';
  String toIso = '';
  bool txLoading = false;
  int txPage = 1, txTotalPages = 1;
  List<BankTx> txRows = [];

  // ===== employees =====
  Future<void> loadEmployees(String kw) async {
    if (!isAccountant) return;
    fetchingEmp = true; notifyListeners();
    employeeOptions = await api.searchEmployees(kw, limit: 50);
    fetchingEmp = false; notifyListeners();
  }

  // ===== create =====
  Future<void> createTopup() async {
    if (!isAccountant) return;
    final n = int.tryParse(amountText);
    if (n == null || n <= 0) return;

    creating = true; notifyListeners();
    final items = await api.createTopup(
      amount: n,
      bankAccountNo: bankAccountNo,
      perEmployee: multiMode && selectedEmployees.isNotEmpty,
      employeeIds: multiMode ? selectedEmployees.map((e) => e.id ?? 0).toList() : null,
      copies: 1,
    );
    creating = false;

    if (multiMode) {
      generatedList = items;
      singleIntent = null;
      singleQrUrl = null;
    } else {
      singleIntent = items.first;
      generatedList = [];
      _startPolling(singleIntent!.code);
      singleQrUrl = await api.getTopupQrUrl(singleIntent!.code);
    }
    notifyListeners();
    fetchTopups(1);
  }

  void toggleMulti(bool v) {
    multiMode = v;
    singleIntent = null;
    singleQrUrl = null;
    generatedList = [];
    _stopPolling();
    notifyListeners();
  }

  void _startPolling(String code) {
    _stopPolling();
    polling = true; notifyListeners();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (t) async {
      final updated = await api.getTopupStatus(code);
      singleIntent = updated;
      notifyListeners();
      if (updated.status != TopupStatus.PENDING &&
          updated.status != TopupStatus.REQUIRES_ACTION) {
        _stopPolling();
        fetchTopups(topupPage);
      }
    });
  }

  void _stopPolling() { _pollTimer?.cancel(); _pollTimer = null; polling = false; }

  // ===== lists =====
  Future<void> fetchTopups(int page) async {
    loadingTopups = true; notifyListeners();
    final scope = isAccountant ? 'created' : 'owner';
    final res = await api.getMyTopups(page: page, size: 10, scope: scope);
    topups = res.rows; topupTotalPages = res.totalPages; topupPage = page;
    loadingTopups = false; notifyListeners();
  }

  Future<void> fetchBankTx(int page) async {
    if (!isAccountant) return;
    txLoading = true; notifyListeners();
    final res = await api.getBankTransactions(
      page: page, size: 15,
      type: txType.isEmpty ? null : txType,
      fromIso: fromIso.isEmpty ? null : fromIso,
      toIso: toIso.isEmpty ? null : toIso,
    );
    txRows = res.rows; txTotalPages = res.totalPages; txPage = page;
    txLoading = false; notifyListeners();
  }

  @override
  void dispose() { _stopPolling(); super.dispose(); }
}
