import 'package:flutter/material.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/models/bank/bank_tx_row.dart';
import 'package:mobile/models/bank/topup_intent.dart';
import 'package:mobile/services/bank_service_impl.dart';

class BankVm extends ChangeNotifier {
  final BankServiceImpl api;
  final bool isAccountant;

  BankVm(this.api, {this.isAccountant = false});

  // ==== FORM CREATE ====
  final amountCtrl = TextEditingController();
  bool creating = false;
  bool multiMode = false;
  List<Account> selectedEmployees = [];

  // Result
  TopupIntent? singleIntent;
  String? singleQrUrl;
  bool polling = false;
  List<TopupIntent> generatedList = [];

  // ==== EMPLOYEE PICKER ====
  List<Account> employeeOptions = [];
  bool fetchingEmp = false;

  // ==== TOPUP HISTORY ====
  bool loadingTopups = false;
  int topupPage = 1;
  int topupTotalPages = 1;
  List<TopupIntent> topups = [];

  // ==== BANK TX ====
  bool txLoading = false;
  int txPage = 1;
  int txTotalPages = 1;
  List<BankTxRow> txRows = [];
  String txType = '';
  String fromIso = '';
  String toIso = '';

  // ==== BANK ACCOUNT INFO ====
  String bankAccountNo = "65609062003";
  String bankName = "TPBank";

  String get amountText => amountCtrl.text;

  void toggleMulti(bool v) {
    multiMode = v;
    notifyListeners();
  }

  // Load employee list
  Future<void> loadEmployees(String keyword) async {
    fetchingEmp = true;
    notifyListeners();
    try {
      // TODO: Replace with real API call to search employees
      employeeOptions = [];
    } finally {
      fetchingEmp = false;
      notifyListeners();
    }
  }

  // Create top-up
  Future<void> createTopup() async {
    if (amountText.isEmpty) return;
    double? amount;
    try {
      amount = double.tryParse(amountText);
    } catch (_) {}
    if (amount == null || amount <= 0) return;

    creating = true;
    notifyListeners();

    try {
      if (multiMode) {
        generatedList = await api.createTopup(
          amount: amount,
          bankAccountNo: bankAccountNo,
          perEmployee: true,
          employeeIds: selectedEmployees.map((e) => e.id ?? 0).toList(),
        );
      } else {
        final list = await api.createTopup(
          amount: amount,
          bankAccountNo: bankAccountNo,
        );
        if (list.isNotEmpty) {
          singleIntent = list.first;
          // fetch QR immediately
          singleQrUrl = await api.getTopupQrUrl(singleIntent!.code);
        }
      }
    } finally {
      creating = false;
      notifyListeners();
    }
  }

  // Fetch top-up history
  Future<void> fetchTopups(int page) async {
    loadingTopups = true;
    notifyListeners();
    try {
      final res = await api.getMyTopups(page: page);
      topups = res.rows
          .map(
            (e) => TopupIntent(
              code: e.code,
              amount: e.amount,
              bankAccountNo: e.bankAccountNo ?? '',
              status: e.status,
              createdAt: e.createdAt,
              completedAt: e.completedAt,
              owner: e.owner,
            ),
          )
          .toList();
      topupPage = page;
      topupTotalPages = res.totalPages;
    } finally {
      loadingTopups = false;
      notifyListeners();
    }
  }

  // Fetch bank transactions
  Future<void> fetchBankTx(int page) async {
    txLoading = true;
    notifyListeners();
    try {
      final res = await api.getBankTransactions(
        page: page,
        fromIso: fromIso,
        toIso: toIso,
      );
      txRows = res.rows;
      txPage = page;
      txTotalPages = res.totalPages;
    } finally {
      txLoading = false;
      notifyListeners();
    }
  }
}
