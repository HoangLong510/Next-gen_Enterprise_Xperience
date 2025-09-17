import 'package:flutter/material.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/services/transaction_service.dart';

class TransactionsPage extends StatefulWidget {
  @override
  _TransactionsPageState createState() => _TransactionsPageState();
}

class _TransactionsPageState extends State<TransactionsPage> {
  late Future<List<FundTransaction>> _transactions;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  void _loadTransactions() {
    setState(() {
      _transactions = TransactionService.getAllTransactions();
    });
  }

  // Helper: split "Name (Email)" thành map
  Map<String, String> _splitCreatedBy(String createdBy) {
    final regExp = RegExp(r'(.+?)\s\(([^)]+)\)');
    final match = regExp.firstMatch(createdBy);

    if (match != null) {
      return {
        'name': match.group(1) ?? '',
        'email': match.group(2) ?? '',
      };
    }
    return {'name': createdBy, 'email': ''};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTransactions,
          ),
          IconButton(
            icon: const Icon(Icons.account_balance),
            onPressed: () {
              Navigator.pushNamed(context, '/accountant/funds');
            },
          ),
        ],
      ),
      body: FutureBuilder<List<FundTransaction>>(
        future: _transactions,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No transactions found.'));
          }

          final transactions = snapshot.data!;

          return ListView.builder(
            itemCount: transactions.length,
            itemBuilder: (context, index) {
              final transaction = transactions[index];
              final createdBy = _splitCreatedBy(transaction.createdByDisplay);

              return Card(
                margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                child: ListTile(
                  leading: Icon(
                    transaction.status == 'PENDING'
                        ? Icons.hourglass_empty
                        : Icons.check_circle,
                    color: transaction.status == 'PENDING'
                        ? Colors.orange
                        : Colors.green,
                  ),
                  title: Text(
                    '${transaction.type} - \$${transaction.amount.toStringAsFixed(2)}',
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Created by: ${createdBy['name']}'),
                      if (createdBy['email']!.isNotEmpty)
                        Text('Email: ${createdBy['email']}'),
                      Text('Status: ${transaction.status}'),
                    ],
                  ),
                  trailing: transaction.status == 'PENDING'
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.check, color: Colors.green),
                              onPressed: () => _approveTransaction(
                                transaction.fundId,
                                transaction.id,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Colors.red),
                              onPressed: () => _rejectTransaction(
                                transaction.fundId,
                                transaction.id,
                              ),
                            ),
                          ],
                        )
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _approveTransaction(int fundId, int transactionId) async {
    await TransactionService.approveTransaction(
      fundId: fundId,
      transactionId: transactionId,
      approve: true,
    );
    _loadTransactions();
  }

  void _rejectTransaction(int fundId, int transactionId) async {
    await TransactionService.approveTransaction(
      fundId: fundId,
      transactionId: transactionId,
      approve: false,
    );
    _loadTransactions();
  }
}
