import 'package:flutter/material.dart';
import '../../models/cash_advance.dart';
import '../../services/cash_advance_service.dart';

class CashAdvanceListPage extends StatefulWidget {
  final String token;
  const CashAdvanceListPage({super.key, required this.token});

  @override
  State<CashAdvanceListPage> createState() => _CashAdvanceListPageState();
}

class _CashAdvanceListPageState extends State<CashAdvanceListPage> {
  late Future<List<CashAdvance>> _future;

  @override
  void initState() {
    super.initState();
    _future = CashAdvanceService.getMyCashAdvances(widget.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Cash Advances")),
      body: FutureBuilder<List<CashAdvance>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final list = snapshot.data!;
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final ca = list[i];
              return Card(
                child: ListTile(
                  title: Text("${ca.amount} VND"),
                  subtitle: Text("${ca.reason ?? ''}\nStatus: ${ca.status}"),
                  trailing: Text("${ca.createdAt.toLocal()}".split(" ")[0]),
                  onTap: () {
                    // TODO: đi tới detail
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: đi tới form
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
