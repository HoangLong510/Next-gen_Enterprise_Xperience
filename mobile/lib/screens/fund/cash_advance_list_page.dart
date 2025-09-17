import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'package:path_provider/path_provider.dart';

import 'package:mobile/models/cash_advance.dart';
import 'package:mobile/services/cash_advance_service.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'cash_advance_form_page.dart';

class CashAdvanceListPage extends StatefulWidget {
  const CashAdvanceListPage({super.key});

  @override
  State<CashAdvanceListPage> createState() => _CashAdvanceListPageState();
}

class _CashAdvanceListPageState extends State<CashAdvanceListPage> {
  late Future<List<CashAdvance>> _future;
  bool _loading = false;
  String _view = "ALL"; // ALL, PENDING, APPROVED, REJECTED, MY

  late bool isAccountant;
  late bool isChief;
  late bool isDirector;
  late bool isAdmin;

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final role = (auth.account?.role ?? '').toUpperCase();

    isAdmin = role == "ADMIN";
    isChief = role == "CHIEFACCOUNTANT" || role == "CHIEF_ACCOUNTANT" || isAdmin;
    isAccountant = role == "ACCOUNTANT" || isChief || isAdmin;
    isDirector = role == "MANAGER" || isAdmin;

    _load();
  }

  void _load() {
    setState(() {
      _loading = true;
      _future = _fetchAdvances();
    });
    _future.whenComplete(() => mounted ? setState(() => _loading = false) : null);
  }

  Future<List<CashAdvance>> _fetchAdvances() async {
    try {
      if (_view == "MY") {
        return await CashAdvanceService.getMyCashAdvances();
      }

      final String status = _view;
      final canSeeAll = isAccountant || isChief || isDirector || isAdmin;

      if (canSeeAll) {
        return await CashAdvanceService.listAdvances(
          status: status,
          scope: null,
        );
      } else {
        return await CashAdvanceService.getMyCashAdvances();
      }
    } catch (_) {
      return [];
    }
  }

  Color _statusColor(String s) {
    switch (s.toUpperCase()) {
      case "PENDING":
        return Colors.orange;
      case "APPROVED":
      case "APPROVED_ACCOUNTANT":
      case "APPROVED_CHIEF":
      case "APPROVED_DIRECTOR":
        return Colors.green;
      case "REJECTED":
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Future<void> _confirmAndDecide(CashAdvance ca, bool approve) async {
    if (ca.id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(approve ? "Confirm Approve" : "Confirm Reject"),
        content: Text(
          approve
              ? "Are you sure you want to APPROVE request #${ca.id}?"
              : "Are you sure you want to REJECT request #${ca.id}?",
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(approve ? "Approve" : "Reject"),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _handleDecision(ca, approve);
    }
  }

  Future<void> _handleDecision(CashAdvance ca, bool approve) async {
    try {
      if (isAccountant && ca.status == "PENDING") {
        await CashAdvanceService.accountantDecision(
          id: ca.id!,
          approve: approve,
          note: approve ? "Approved by Accountant" : "Rejected by Accountant",
        );
      } else if (isChief && ca.status == "APPROVED_ACCOUNTANT") {
        await CashAdvanceService.chiefDecision(
          id: ca.id!,
          approve: approve,
          note: approve ? "Approved by Chief" : "Rejected by Chief",
          signatureDataUrl: null,
        );
      } else if (isDirector && ca.status == "APPROVED_CHIEF") {
        await CashAdvanceService.directorDecision(
          id: ca.id!,
          approve: approve,
          note: approve ? "Approved by Director" : "Rejected by Director",
          signatureDataUrl: null,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("You are not allowed to take action at this state.")),
        );
        return;
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approve ? "Approved" : "Rejected")),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error updating: $e")),
      );
    }
  }

  // ====== Preview PDF ======
  Future<void> _showPdfFromUrl(String url) async {
    try {
      // tải file PDF về tạm
      final response = await http.get(Uri.parse(url));
      final bytes = response.bodyBytes;
      final dir = await getTemporaryDirectory();
      final file = File("${dir.path}/temp.pdf");
      await file.writeAsBytes(bytes, flush: true);

      if (!mounted) return;
      showDialog(
        context: context,
        builder: (_) => Dialog(
          child: SizedBox(
            width: 400,
            height: 600,
            child: PDFView(
              filePath: file.path,
            ),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error loading PDF: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Cash Advances"),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: "Reload",
          ),
          PopupMenuButton<String>(
            initialValue: _view,
            onSelected: (v) {
              setState(() {
                _view = v;
              });
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: "ALL", child: Text("All")),
              PopupMenuItem(value: "PENDING", child: Text("Pending")),
              PopupMenuItem(value: "APPROVED", child: Text("Approved")),
              PopupMenuItem(value: "REJECTED", child: Text("Rejected")),
              PopupMenuItem(value: "MY", child: Text("My Requests")),
            ],
          ),
        ],
      ),
      body: FutureBuilder<List<CashAdvance>>(
        future: _future,
        builder: (context, snapshot) {
          if (_loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }

          final list = snapshot.data ?? [];
          if (list.isEmpty) {
            return const Center(child: Text("No cash advances found."));
          }

          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor: MaterialStateProperty.all(Colors.grey.shade200),
              columnSpacing: 24,
              columns: const [
                DataColumn(label: Text("ID")),
                DataColumn(label: Text("Amount (VND)")),
                DataColumn(label: Text("Reason")),
                DataColumn(label: Text("Status")),
                DataColumn(label: Text("Created At")),
                DataColumn(label: Text("File")), // 👈 thêm cột file
                DataColumn(label: Text("Actions")),
              ],
              rows: list.map((ca) {
                return DataRow(
                  cells: [
                    DataCell(Text(ca.id.toString())),
                    DataCell(Text(ca.amount.toStringAsFixed(0))),
                    DataCell(Text(ca.reason ?? "-")),
                    DataCell(
                      Chip(
                        label: Text(ca.status),
                        backgroundColor: _statusColor(ca.status).withOpacity(0.2),
                        side: BorderSide(color: _statusColor(ca.status)),
                      ),
                    ),
                    DataCell(Text(
                      ca.createdAt.toLocal().toString().split(".").first,
                    )),
                    DataCell(
                      ca.fileUrl != null
                          ? TextButton.icon(
                              icon: const Icon(Icons.picture_as_pdf, color: Colors.red),
                              label: const Text("View"),
                              onPressed: () => _showPdfFromUrl(ca.fileUrl!),
                            )
                          : const Text("-"),
                    ),
                    DataCell(Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (isAccountant && ca.status == "PENDING") ...[
                          IconButton(
                            icon: const Icon(Icons.check, color: Colors.green),
                            tooltip: "Approve (Accountant)",
                            onPressed: () => _confirmAndDecide(ca, true),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            tooltip: "Reject (Accountant)",
                            onPressed: () => _confirmAndDecide(ca, false),
                          ),
                        ],
                        if (isChief && ca.status == "APPROVED_ACCOUNTANT") ...[
                          IconButton(
                            icon: const Icon(Icons.check, color: Colors.green),
                            tooltip: "Approve (Chief)",
                            onPressed: () => _confirmAndDecide(ca, true),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            tooltip: "Reject (Chief)",
                            onPressed: () => _confirmAndDecide(ca, false),
                          ),
                        ],
                        if (isDirector && ca.status == "APPROVED_CHIEF") ...[
                          IconButton(
                            icon: const Icon(Icons.check, color: Colors.green),
                            tooltip: "Approve (Director)",
                            onPressed: () => _confirmAndDecide(ca, true),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            tooltip: "Reject (Director)",
                            onPressed: () => _confirmAndDecide(ca, false),
                          ),
                        ],
                      ],
                    )),
                  ],
                  onSelectChanged: (_) {
                    // TODO: navigate to detail page
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CashAdvanceFormPage()),
          );
          if (created == true) _load();
        },
        icon: const Icon(Icons.add),
        label: const Text("New Request"),
      ),
    );
  }
}
