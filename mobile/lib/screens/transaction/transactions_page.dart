import 'package:flutter/material.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/services/transaction_service.dart';

class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => _TransactionsPageState();
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

  Future<void> _approve(
    int fundId,
    int txId,
    bool approve, {
    String? comment,
  }) async {
    try {
      await TransactionService.approveTransaction(
        fundId: fundId,
        transactionId: txId,
        approve: approve,
        comment: comment,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approve ? "Approved" : "Rejected")),
      );
      _loadTransactions();
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Failed: $e")));
    }
  }

  void _rejectWithNote(int fundId, int txId) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Reject Transaction"),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: "Rejection note",
              hintText: "Enter reason...",
            ),
            maxLines: 3,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _approve(fundId, txId, false, comment: controller.text);
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text("Reject"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("All Transactions")),
      body: FutureBuilder<List<FundTransaction>>(
        future: _transactions,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }
          final txs = snapshot.data ?? [];
          if (txs.isEmpty) {
            return const Center(child: Text("No transactions found."));
          }

          return ListView.builder(
            itemCount: txs.length,
            itemBuilder: (context, index) {
              final tx = txs[index];
              return Card(
                margin: const EdgeInsets.all(8),
                color: tx.type == "INCREASE"
                    ? Colors.green.shade50
                    : Colors.red.shade50,
                child: ListTile(
                  title: Text(
                    "${tx.type} - \$${tx.amount.toStringAsFixed(2)}",
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Status: ${tx.status}"),
                      if (tx.note != null) Text("Note: ${tx.note}"),
                      if (tx.approvalComment != null)
                        Text("Approval Comment: ${tx.approvalComment}"),
                    ],
                  ),
                  trailing: () {
                    switch (tx.status.toUpperCase()) {
                      case "APPROVED":
                        return const Icon(
                          Icons.check_circle,
                          color: Colors.green,
                        );
                      case "REJECTED":
                        return const Icon(
                          Icons.cancel,
                          color: Colors.red,
                        );
                      case "PENDING":
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.check, color: Colors.green),
                              tooltip: "Approve",
                              onPressed: () => _approve(tx.fundId!, tx.id, true),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Colors.red),
                              tooltip: "Reject",
                              onPressed: () => _rejectWithNote(tx.fundId!, tx.id),
                            ),
                          ],
                        );
                      default:
                        return const Icon(
                          Icons.help_outline,
                          color: Colors.grey,
                        );
                    }
                  }(),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
