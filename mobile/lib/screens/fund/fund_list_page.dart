import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/fund.dart';
import 'package:mobile/screens/fund/fund_detail_page.dart';
import 'package:mobile/screens/transaction/transaction_create_page.dart';
import 'package:mobile/services/fund_service.dart';

class FundListPage extends StatefulWidget {
  const FundListPage({super.key});

  @override
  State<FundListPage> createState() => _FundListPageState();
}

class _FundListPageState extends State<FundListPage> {
  late Future<(List<Fund>, int)> _futureFunds;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _loadFunds();
  }

  void _loadFunds() {
    setState(() {
      _futureFunds = FundService.getFunds();
    });
  }

  String formatCurrency(double amount) {
    final formatter = NumberFormat('#,###', 'en_US');
    return "\$${formatter.format(amount)}";
  }

  String formatDate(DateTime dt) => DateFormat('dd/MM/yyyy').format(dt);
  String formatTime(DateTime dt) => DateFormat('HH:mm:ss').format(dt);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text("Fund List"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            Navigator.pushNamedAndRemoveUntil(context, "/", (route) => false);
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Reload",
            onPressed: _loadFunds,
          ),
        ],
      ),
      body: FutureBuilder<(List<Fund>, int)>(
        future: _futureFunds,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }

          final (funds, total) = snapshot.data!;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Row(
                  children: [
                    Text(
                      "Total Funds: $total",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.builder(
                  itemCount: funds.length,
                  itemBuilder: (context, index) {
                    final fund = funds[index];
                    final balanceText = formatCurrency(fund.balance);

                    return InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => FundDetailPage(id: fund.id),
                          ),
                        );
                      },
                      child: Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        elevation: 3,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Text(
                                      fund.name,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  Chip(
                                    label: Text(fund.status),
                                    backgroundColor: fund.status == 'ACTIVE'
                                        ? Colors.green.shade200
                                        : Colors.grey.shade300,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text("Balance: $balanceText"),
                              Text("Created Date: ${formatDate(fund.createdAt)}"),
                              Text("Created Time: ${formatTime(fund.createdAt)}"),
                              const SizedBox(height: 12),
                              Align(
                                alignment: Alignment.centerRight,
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    _scaffoldKey.currentState?.openEndDrawer();
                                  },
                                  icon: const Icon(Icons.attach_money),
                                  label: const Text("Create Transaction"),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.green.shade800,
                                    side: BorderSide(
                                      color: Colors.green.shade700,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 10,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
      endDrawer: Drawer(
        child: Navigator(
          onGenerateRoute: (settings) {
            return MaterialPageRoute(
              builder: (context) => const CreateTransactionPage(
                fundId: 0, // Will be replaced by actual fundId
              ),
            );
          },
        ),
      ),
    );
  }
}
