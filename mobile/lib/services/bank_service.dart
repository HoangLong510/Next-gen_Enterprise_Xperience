import 'package:mobile/models/account.dart';
import 'package:mobile/models/bank/bank_tx.dart';
import 'package:mobile/models/bank/topup_intent.dart';
import 'package:mobile/models/bank/topup_row.dart';

abstract class BankService {
  /// Tìm nhân sự  theo keyword
  Future<List<Account>> searchEmployees(String keyword, {int limit = 50});

  /// Tạo topup 
  Future<List<TopupIntent>> createTopup({
    required int amount,
    required String bankAccountNo,
    bool perEmployee = false,
    List<int>? employeeIds,
    int copies = 1,
  });

  /// Lấy trạng thái topup theo code
  Future<TopupIntent> getTopupStatus(String code);

  /// Lấy QR image URL theo code
  Future<String?> getTopupQrUrl(String code);

  /// Lịch sử topup 
  Future<({List<TopupRow> rows, int totalPages})> getMyTopups({
    required int page,
    required int size,
    required String scope, 
  });

  /// Lịch sử giao dịch ngân hàng 
  Future<({List<BankTx> rows, int totalPages})> getBankTransactions({
    required int page,
    required int size,
    String? type,        
    String? fromIso,     
    String? toIso,
  });
}
