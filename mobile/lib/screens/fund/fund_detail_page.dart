import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/fund.dart';
import 'package:mobile/models/transaction.dart';
import 'package:mobile/services/fund_service.dart';
import 'package:mobile/services/transaction_service.dart';

class FundDetailPage extends StatefulWidget {
  final int id;
  const FundDetailPage({super.key, required this.id});

  @override
  State<FundDetailPage> createState() => _FundDetailPageState();
}

class _FundDetailPageState extends State<FundDetailPage> {
  late Future<Fund> _futureFund;
  late Future<List<FundTransaction>> _futureTransactions;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _futureFund = FundService.getFundById(widget.id);
    _futureTransactions = TransactionService.getTransactionsByFund(widget.id);
  }

  String formatDateTime(String iso) {
    final dt = DateTime.parse(iso);
    return DateFormat('dd/MM/yyyy HH:mm:ss').format(dt);
  }

  String formatCurrency(double amount) {
    final formatter = NumberFormat('#,###', 'en_US');
    return "\$${formatter.format(amount)}";
  }

  void _openTransactionDrawer() {
    _scaffoldKey.currentState?.openEndDrawer();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Fund>(
      future: _futureFund,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text("Loading...")),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        final fund = snapshot.data!;

        return Scaffold(
          key: _scaffoldKey,
          appBar: AppBar(
            backgroundColor: Colors.green,
            title: Text(
              fund.name,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: _openTransactionDrawer,
              ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text(
                      "Balance: ${formatCurrency(fund.balance)}",
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    Text(
                      "Status: ${fund.status}",
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    Text(
                      "Created at: ${formatDateTime(fund.createdAt.toIso8601String())}",
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "Transaction History",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: FutureBuilder<List<FundTransaction>>(
                  future: _futureTransactions,
                  builder: (context, txSnapshot) {
                    if (!txSnapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final txs = txSnapshot.data!;
                    if (txs.isEmpty) {
                      return const Center(child: Text("No transactions yet."));
                    }

                    return ListView.separated(
                      itemCount: txs.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final tx = txs[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          elevation: 4,
                          child: ListTile(
                            leading: Icon(
                              tx.type == 'INCREASE'
                                  ? Icons.arrow_upward
                                  : Icons.arrow_downward,
                              color: tx.type == 'INCREASE' ? Colors.green : Colors.red,
                            ),
                            title: Text(
                              formatCurrency(tx.amount),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Status: ${tx.status}",
                                  style: const TextStyle(color: Colors.grey),
                                ),
                                Text(
                                  "Created at: ${formatDateTime(tx.createdAt.toIso8601String())}",
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                            trailing: tx.status == 'APPROVED'
                                ? const Icon(Icons.verified, color: Colors.blue)
                                : const Icon(Icons.hourglass_empty),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
          endDrawer: Drawer(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Create New Transaction',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    decoration: const InputDecoration(labelText: 'Amount'),
                  ),
                  TextField(
                    decoration: const InputDecoration(labelText: 'Transaction Type'),
                  ),
                  TextField(
                    decoration: const InputDecoration(labelText: 'Note'),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      _scaffoldKey.currentState?.closeEndDrawer();
                    },
                    child: const Text('Submit Transaction'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
