import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/services/transaction_service.dart';

class TransactionApprovePage extends StatefulWidget {
  const TransactionApprovePage({super.key});

  @override
  State<TransactionApprovePage> createState() => _TransactionApprovePageState();
}

class _TransactionApprovePageState extends State<TransactionApprovePage> {
  late Future<List<FundTransaction>> _transactions;
  final _currency = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  // Load transactions from the service
  void _loadTransactions() {
    setState(() {
      _transactions = TransactionService.getAllTransactions();
    });
  }

  // Helper function to split "Name (Email)" into name and email
  Map<String, String> _splitCreatedBy(String? createdBy) {
    final text = createdBy ?? '';
    final regExp = RegExp(r'(.+?)\s\(([^)]+)\)');
    final match = regExp.firstMatch(text);

    if (match != null) {
      return {
        'name': match.group(1) ?? '',
        'email': match.group(2) ?? '',
      };
    }
    return {'name': text, 'email': ''}; // If no match, treat the entire string as name
  }

  Future<void> _approveTransaction(int transactionId) async {
    try {
      await TransactionService.approveTransaction(
        fundId: 1, // TODO: thay bằng fundId thực tế
        transactionId: transactionId,
        approve: true,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã duyệt giao dịch')),
      );
      _loadTransactions();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi duyệt giao dịch: $e')),
      );
    }
  }

  Future<void> _rejectTransaction(int transactionId) async {
    try {
      await TransactionService.approveTransaction(
        fundId: 1, // TODO: thay bằng fundId thực tế
        transactionId: transactionId,
        approve: false,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã từ chối giao dịch')),
      );
      _loadTransactions();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi từ chối giao dịch: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Duyệt giao dịch'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTransactions,
            tooltip: 'Tải lại',
          ),
          IconButton(
            icon: const Icon(Icons.account_balance),
            onPressed: () => Navigator.pushNamed(context, '/accountant/funds'),
            tooltip: 'Quản lý quỹ',
          ),
        ],
      ),
      body: FutureBuilder<List<FundTransaction>>(
        future: _transactions,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Lỗi: ${snapshot.error}'));
          }
          final data = snapshot.data ?? [];
          if (data.isEmpty) {
            return const Center(child: Text('Không có giao dịch nào.'));
          }

          return RefreshIndicator(
            onRefresh: () async => _loadTransactions(),
            child: ListView.builder(
              itemCount: data.length,
              itemBuilder: (context, index) {
                final t = data[index];
                final createdBy = _splitCreatedBy(t.createdByDisplay);

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  child: ListTile(
                    leading: Icon(
                      t.status == 'PENDING' ? Icons.hourglass_empty : Icons.check_circle,
                      color: t.status == 'PENDING' ? Colors.orange : Colors.green,
                    ),
                    title: Text('${t.type} - ${_currency.format(t.amount)}'),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Người tạo: ${createdBy['name']}'),
                        if ((createdBy['email'] ?? '').isNotEmpty)
                          Text('Email: ${createdBy['email']}'),
                        Text('Trạng thái: ${t.status}'),
                      ],
                    ),
                    trailing: t.status == 'PENDING'
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.check, color: Colors.green),
                                tooltip: 'Duyệt',
                                onPressed: () => _approveTransaction(t.id),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, color: Colors.red),
                                tooltip: 'Từ chối',
                                onPressed: () => _rejectTransaction(t.id),
                              ),
                            ],
                          )
                        : null,
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
