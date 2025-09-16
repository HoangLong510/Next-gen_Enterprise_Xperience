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

  // Load transactions from the service
  void _loadTransactions() {
    _transactions = TransactionService.getAllTransactions();
  }

  // Helper function to split "Name (Email)" into name and email
  Map<String, String> _splitCreatedBy(String createdBy) {
    final regExp = RegExp(r'(.+?)\s\(([^)]+)\)');
    final match = regExp.firstMatch(createdBy);

    if (match != null) {
      return {
        'name': match.group(1) ?? '',
        'email': match.group(2) ?? '',
      };
    }
    return {'name': createdBy, 'email': ''};  // If no match, treat the entire string as name
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Transactions'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadTransactions,
          ),
          // Add a button for navigating to the Fund page
          IconButton(
            icon: Icon(Icons.account_balance),
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
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text('No transactions found.'));
          }

          final transactions = snapshot.data!;

          return ListView.builder(
            itemCount: transactions.length,
            itemBuilder: (context, index) {
              final transaction = transactions[index];

              // Split "Created by" into name and email
              final createdBy = _splitCreatedBy(transaction.createdByDisplay);

              return Card(
                margin: EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                child: ListTile(
                  leading: Icon(
                    transaction.status == 'PENDING'
                        ? Icons.hourglass_empty
                        : Icons.check_circle,
                    color: transaction.status == 'PENDING'
                        ? Colors.orange
                        : Colors.green,
                  ),
                  title: Text('${transaction.type} - \$${transaction.amount.toStringAsFixed(2)}'),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Created by: ${createdBy['name']}'),
                      Text('Email: ${createdBy['email']}'),
                      Text('Status: ${transaction.status}'),
                    ],
                  ),
                  trailing: transaction.status == 'PENDING'
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(Icons.check, color: Colors.green),
                              onPressed: () => _approveTransaction(transaction.id),
                            ),
                            IconButton(
                              icon: Icon(Icons.close, color: Colors.red),
                              onPressed: () => _rejectTransaction(transaction.id),
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

  void _approveTransaction(int transactionId) async {
    await TransactionService.approveTransaction(
      fundId: 1, // Example fundId, replace with actual value
      transactionId: transactionId,
      approve: true,
    );
    _loadTransactions();
  }

  void _rejectTransaction(int transactionId) async {
    await TransactionService.approveTransaction(
      fundId: 1, 
      transactionId: transactionId,
      approve: false,
    );
    _loadTransactions();
  }
}
