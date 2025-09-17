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

  Map<String, dynamic> _filters = {
    "type": "",
    "status": "",
    "createdFrom": "",
    "createdTo": "",
    "fundName": "",
    "createdBy": "",
    "amountMin": "",
    "amountMax": "",
    "search": "",
  };

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  void _loadTransactions() {
    setState(() {
      _transactions =
          TransactionService.getAllTransactions(filters: _filters);
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
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text("Failed: $e")));
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

  Widget _buildFilters() {
    return ExpansionTile(
      title: const Text("Filters"),
      children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              // Search
              TextField(
                decoration: const InputDecoration(labelText: "Search"),
                onChanged: (val) => _filters["search"] = val,
              ),
              const SizedBox(height: 8),

              // Status
              DropdownButtonFormField(
                value: _filters["status"],
                items: const [
                  DropdownMenuItem(value: "", child: Text("All Status")),
                  DropdownMenuItem(value: "PENDING", child: Text("Pending")),
                  DropdownMenuItem(value: "APPROVED", child: Text("Approved")),
                  DropdownMenuItem(value: "REJECTED", child: Text("Rejected")),
                ],
                onChanged: (val) => _filters["status"] = val,
                decoration: const InputDecoration(labelText: "Status"),
              ),
              const SizedBox(height: 8),

              // Type
              DropdownButtonFormField(
                value: _filters["type"],
                items: const [
                  DropdownMenuItem(value: "", child: Text("All Types")),
                  DropdownMenuItem(value: "INCREASE", child: Text("Increase")),
                  DropdownMenuItem(value: "DECREASE", child: Text("Decrease")),
                ],
                onChanged: (val) => _filters["type"] = val,
                decoration: const InputDecoration(labelText: "Transaction Type"),
              ),
              const SizedBox(height: 8),

              // Fund Name
              TextField(
                decoration: const InputDecoration(labelText: "Fund Name"),
                onChanged: (val) => _filters["fundName"] = val,
              ),
              const SizedBox(height: 8),

              // Created By
              TextField(
                decoration: const InputDecoration(labelText: "Created By"),
                onChanged: (val) => _filters["createdBy"] = val,
              ),
              const SizedBox(height: 8),

              // Date From
              TextField(
                decoration: const InputDecoration(labelText: "Created From"),
                keyboardType: TextInputType.datetime,
                onChanged: (val) => _filters["createdFrom"] = val,
              ),
              const SizedBox(height: 8),

              // Date To
              TextField(
                decoration: const InputDecoration(labelText: "Created To"),
                keyboardType: TextInputType.datetime,
                onChanged: (val) => _filters["createdTo"] = val,
              ),
              const SizedBox(height: 8),

              // Amount Min
              TextField(
                decoration: const InputDecoration(labelText: "Min Amount"),
                keyboardType: TextInputType.number,
                onChanged: (val) => _filters["amountMin"] = val,
              ),
              const SizedBox(height: 8),

              // Amount Max
              TextField(
                decoration: const InputDecoration(labelText: "Max Amount"),
                keyboardType: TextInputType.number,
                onChanged: (val) => _filters["amountMax"] = val,
              ),
              const SizedBox(height: 16),

              // Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _filters.updateAll((key, value) => "");
                      });
                      _loadTransactions();
                    },
                    child: const Text("Reset"),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _loadTransactions,
                    child: const Text("Apply Filters"),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("All Transactions")),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: FutureBuilder<List<FundTransaction>>(
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
                          style:
                              const TextStyle(fontWeight: FontWeight.bold),
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
                                    icon: const Icon(Icons.check,
                                        color: Colors.green),
                                    tooltip: "Approve",
                                    onPressed: () =>
                                        _approve(tx.fundId!, tx.id, true),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close,
                                        color: Colors.red),
                                    tooltip: "Reject",
                                    onPressed: () =>
                                        _rejectWithNote(tx.fundId!, tx.id),
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
          ),
        ],
      ),
    );
  }
}
