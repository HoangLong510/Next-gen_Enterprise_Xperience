import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // Clipboard cho _Copyable
import 'package:provider/provider.dart';
import 'package:mobile/constants/currency.dart';
import 'package:mobile/models/bank/topup_status.dart';
import 'package:mobile/providers/bank_vm.dart';
import 'package:mobile/services/bank_service_impl.dart';
import 'package:mobile/widgets/mobile_pay_actions.dart';

class BankAndTopupPage extends StatelessWidget {
  const BankAndTopupPage({super.key, required this.isAccountant});
  final bool isAccountant; // truyền từ role (Account.role)

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => BankVm(BankServiceImpl(), isAccountant: isAccountant)
        ..loadEmployees('')
        ..fetchTopups(1)
        ..fetchBankTx(1),
      child: const _BankScreen(),
    );
  }
}

class _BankScreen extends StatelessWidget {
  const _BankScreen();
  @override
  Widget build(BuildContext context) {
    final vm = context.watch<BankVm>();
    return Scaffold(
      appBar: AppBar(title: const Text('Bank & Top-up')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            if (vm.isAccountant) _CreateTopupCard(vm),
            _TopupsCard(vm),
            if (vm.isAccountant) _BankTxCard(vm),
          ],
        ),
      ),
    );
  }
}

/* ===================== CREATE ===================== */
class _CreateTopupCard extends StatelessWidget {
  const _CreateTopupCard(this.vm);
  final BankVm vm;

  @override
  Widget build(BuildContext context) {
    final amountCtrl = TextEditingController(text: vm.amountText);
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
              child: Text('Top-up (Bank transfer)',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            ),
            const Text('One code per person'),
            Switch(value: vm.multiMode, onChanged: vm.toggleMulti),
          ]),
          const SizedBox(height: 6),
          const Text(
            'Create a unique transfer code. When bank transfer with this code arrives, it auto-confirms.',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 12),
          Wrap(
              spacing: 12,
              runSpacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 240,
                  child: TextField(
                    controller: amountCtrl,
                    onChanged: (v) => vm.amountText = v,
                    decoration: const InputDecoration(
                        labelText: 'Amount', hintText: 'e.g. 100000'),
                    keyboardType: TextInputType.number,
                  ),
                ),
                SizedBox(
                  width: 240,
                  child: TextField(
                    controller: TextEditingController(text: vm.bankAccountNo),
                    readOnly: true,
                    decoration: const InputDecoration(
                        labelText: 'Receiving Account No.'),
                  ),
                ),
                SizedBox(
                  width: 180,
                  child: TextField(
                    controller: TextEditingController(text: vm.bankName),
                    readOnly: true,
                    decoration:
                        const InputDecoration(labelText: 'Bank'),
                  ),
                ),
              ]),
          if (vm.multiMode) const SizedBox(height: 10),
          if (vm.multiMode) _EmployeePicker(vm),
          const SizedBox(height: 12),
          SizedBox(
            width: vm.multiMode ? 260 : 220,
            child: FilledButton.icon(
              onPressed: vm.creating ||
                      vm.amountText.isEmpty ||
                      (vm.multiMode && vm.selectedEmployees.isEmpty)
                  ? null
                  : vm.createTopup,
              icon: vm.creating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.bolt),
              label: Text(vm.multiMode
                  ? 'Generate codes for selected'
                  : 'Generate my code'),
            ),
          ),
          if (vm.singleIntent != null) const SizedBox(height: 12),
          if (vm.singleIntent != null) _SingleResult(vm),
          if (vm.multiMode && vm.generatedList.isNotEmpty)
            const SizedBox(height: 12),
          if (vm.multiMode && vm.generatedList.isNotEmpty)
            _GeneratedList(vm),
        ]),
      ),
    );
  }
}

class _EmployeePicker extends StatelessWidget {
  const _EmployeePicker(this.vm);
  final BankVm vm;
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(
        spacing: 6,
        children: vm.selectedEmployees
            .map((e) => Chip(
                  label: Text(
                      '${e.firstName ?? ''} ${e.lastName ?? ''}'.trim()),
                  onDeleted: () {
                    vm.selectedEmployees.removeWhere((x) => x.id == e.id);
                    vm.notifyListeners();
                  },
                ))
            .toList(),
      ),
      const SizedBox(height: 6),
      TextField(
        decoration: InputDecoration(
          labelText: 'Pick employees',
          hintText: 'Search by name / phone / email',
          suffixIcon: vm.fetchingEmp
              ? const Padding(
                  padding: EdgeInsets.all(8.0),
                  child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : const Icon(Icons.search),
        ),
        onChanged: vm.loadEmployees,
        onTap: () => vm.loadEmployees(''),
      ),
      const SizedBox(height: 6),
      SizedBox(
        height: 220,
        child: Card(
          child: ListView.builder(
            itemCount: vm.employeeOptions.length,
            itemBuilder: (_, i) {
              final e = vm.employeeOptions[i];
              final picked =
                  vm.selectedEmployees.any((x) => x.id == e.id);
              return ListTile(
                leading: CircleAvatar(
                    child: Text((e.firstName ?? '?').isNotEmpty
                        ? (e.firstName![0])
                        : '?')),
                title: Text(
                    '${e.firstName ?? ''} ${e.lastName ?? ''}'.trim()),
                subtitle: Text(e.email ?? e.phone ?? '—'),
                trailing:
                    picked ? const Icon(Icons.check, color: Colors.green) : null,
                onTap: () {
                  if (!picked) {
                    vm.selectedEmployees.add(e);
                  } else {
                    vm.selectedEmployees.removeWhere((x) => x.id == e.id);
                  }
                  vm.notifyListeners();
                },
              );
            },
          ),
        ),
      ),
    ]);
  }
}

class _SingleResult extends StatelessWidget {
  const _SingleResult(this.vm);
  final BankVm vm;

  @override
  Widget build(BuildContext context) {
    final it = vm.singleIntent!;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Card(
        color: it.status == TopupStatus.SUCCESS
            ? Colors.green.shade50
            : Colors.blue.shade50,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Text('Status: ${it.status.name}${vm.polling ? ' • polling…' : ''}',
              style: const TextStyle(fontWeight: FontWeight.w600)),
        ),
      ),
      const SizedBox(height: 6),
      Wrap(spacing: 12, runSpacing: 12, children: [
        SizedBox(
          width: 420,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Row(
                        label: 'Transfer content/code',
                        child: _Copyable(text: it.code)),
                    _Row(
                        label: 'Amount',
                        child: Text(formatVND(it.amount))),
                    _Row(
                        label: 'Receiving account',
                        child: Text(it.bankAccountNo)),
                    _Row(
                        label: 'Completed at',
                        child: Text(it.completedAt?.toLocal().toString() ?? '-')),
                  ]),
            ),
          ),
        ),
        // --- MOBILE-FIRST ACTIONS + QR ---
        SizedBox(
          width: 360,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: LayoutBuilder(
                builder: (context, _) {
                  final isMobile = MediaQuery.of(context).size.width < 600;

                  if (isMobile) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Thanh toán nhanh',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        if (vm.singleQrUrl != null)
                          Center(
                            child: Image.network(
                              vm.singleQrUrl!,
                              width: 200,
                              height: 200,
                              fit: BoxFit.contain,
                            ),
                          )
                        else
                          const Center(
                            child: Text('Generating QR…',
                                style: TextStyle(color: Colors.black54)),
                          ),
                        const SizedBox(height: 12),
                        MobilePayActions(
                          bankCode: 'TPBank', // đổi nếu cần
                          accountNo: it.bankAccountNo,
                          amount: it.amount,
                          content: it.code,
                          qrUrl: vm.singleQrUrl ?? '',
                        ),
                      ],
                    );
                  }

                  // Desktop/tablet giữ layout QR cũ
                  return Column(
                    children: [
                      const Text('Scan VietQR',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      vm.singleQrUrl == null
                          ? const Text('Generating QR…',
                              style: TextStyle(color: Colors.black54))
                          : Image.network(
                              vm.singleQrUrl!,
                              width: 220,
                              height: 220,
                              fit: BoxFit.contain,
                            ),
                      const SizedBox(height: 8),
                      Text('QR includes amount & content: ${it.code}',
                          style: const TextStyle(color: Colors.black54)),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ]),
    ]);
  }
}

class _GeneratedList extends StatelessWidget {
  const _GeneratedList(this.vm);
  final BankVm vm;
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Generated codes',
          style: TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      Card(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columns: const [
              DataColumn(label: Text('#')),
              DataColumn(label: Text('Employee')),
              DataColumn(label: Text('Code')),
              DataColumn(label: Text('Amount')),
              DataColumn(label: Text('Bank account')),
              DataColumn(label: Text('QR')),
            ],
            rows: [
              for (int i = 0; i < vm.generatedList.length; i++)
                DataRow(cells: [
                  DataCell(Text('${i + 1}')),
                  DataCell(Text(
                    vm.selectedEmployees.length > i
                        ? '${vm.selectedEmployees[i].firstName ?? ''} ${vm.selectedEmployees[i].lastName ?? ''}'.trim()
                        : '—',
                  )),
                  DataCell(_Copyable(text: vm.generatedList[i].code)),
                  DataCell(Text(formatVND(vm.generatedList[i].amount))),
                  DataCell(Text(vm.generatedList[i].bankAccountNo)),
                  DataCell(TextButton.icon(
                    icon: const Icon(Icons.qr_code_2),
                    label: const Text('QR'),
                    onPressed: () async {
                      final url = await vm.api
                          .getTopupQrUrl(vm.generatedList[i].code);
                      if (!context.mounted) return;
                      final isMobile =
                          MediaQuery.of(context).size.width < 600;
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          content: SizedBox(
                            width: 320,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (url == null)
                                  const Text('Generating QR…')
                                else
                                  Image.network(url,
                                      width: 200, height: 200),
                                if (isMobile && url != null) ...[
                                  const SizedBox(height: 12),
                                  MobilePayActions(
                                    bankCode: 'TPBank',
                                    accountNo:
                                        vm.generatedList[i].bankAccountNo,
                                    amount:
                                        vm.generatedList[i].amount,
                                    content:
                                        vm.generatedList[i].code,
                                    qrUrl: url,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  )),
                ]),
            ],
          ),
        ),
      ),
      const SizedBox(height: 6),
      const Card(
        color: Color(0xFFE3F2FD),
        child: Padding(
          padding: EdgeInsets.all(8.0),
          child: Text(
              'Each employee gets a unique code; matching transfers will be auto-confirmed.'),
        ),
      ),
    ]);
  }
}

/* ===================== TOPUP HISTORY ===================== */
class _TopupsCard extends StatelessWidget {
  const _TopupsCard(this.vm);
  final BankVm vm;
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(vm.isAccountant ? 'Fund top-up history' : 'My top-up history',
              style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (vm.loadingTopups)
            const Center(
                child: Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator())),
          if (!vm.loadingTopups)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  const DataColumn(label: Text('#')),
                  const DataColumn(label: Text('Code')),
                  if (vm.isAccountant) const DataColumn(label: Text('Owner')),
                  const DataColumn(label: Text('Amount')),
                  const DataColumn(label: Text('Receiving account')),
                  const DataColumn(label: Text('Status')),
                  const DataColumn(label: Text('Completed at')),
                  const DataColumn(label: Text('Created at')),
                ],
                rows: [
                  for (int i = 0; i < vm.topups.length; i++)
                    DataRow(cells: [
                      DataCell(Text(
                          '${(vm.topupPage - 1) * 10 + i + 1}')),
                      DataCell(SizedBox(
                          width: 220,
                          child: Text(vm.topups[i].code,
                              overflow: TextOverflow.ellipsis))),
                      if (vm.isAccountant)
                        DataCell(SizedBox(
                          width: 180,
                          child: Text(
                            (() {
                              final o = vm.topups[i].owner;
                              return o == null
                                  ? '—'
                                  : '${o.firstName ?? ''} ${o.lastName ?? ''}'
                                      .trim();
                            })(),
                            overflow: TextOverflow.ellipsis,
                          ),
                        )),
                      DataCell(Text(formatVND(vm.topups[i].amount))),
                      DataCell(Text(vm.topups[i].bankAccountNo ?? '-')),
                      DataCell(Chip(
                        label: Text(vm.topups[i].status.name),
                        backgroundColor: _statusColor(vm.topups[i].status)
                            .withOpacity(.15),
                        side: BorderSide(
                            color: _statusColor(vm.topups[i].status)),
                      )),
                      DataCell(Text(vm.topups[i].completedAt
                              ?.toLocal()
                              .toString() ??
                          '-')),
                      DataCell(Text(vm.topups[i].createdAt
                              ?.toLocal()
                              .toString() ??
                          '-')),
                    ]),
                ],
              ),
            ),
          const SizedBox(height: 8),
          _Pager(
              page: vm.topupPage,
              totalPages: vm.topupTotalPages,
              onChanged: vm.fetchTopups),
        ]),
      ),
    );
  }
}

/* ===================== BANK TX ===================== */
class _BankTxCard extends StatelessWidget {
  const _BankTxCard(this.vm);
  final BankVm vm;
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Bank transactions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(spacing: 12, runSpacing: 12, children: [
            SizedBox(
              width: 220,
              child: DropdownButtonFormField<String>(
                value: vm.txType.isEmpty ? null : vm.txType,
                items: const [
                  DropdownMenuItem(
                      value: 'CREDIT', child: Text('Credit (in)')),
                  DropdownMenuItem(
                      value: 'DEBIT', child: Text('Debit (out)')),
                ],
                decoration: const InputDecoration(labelText: 'Type'),
                onChanged: (v) => vm
                  ..txType = v ?? ''
                  ..notifyListeners(),
              ),
            ),
            SizedBox(
              width: 220,
              child: TextField(
                decoration:
                    const InputDecoration(labelText: 'From (yyyy-MM-dd)'),
                onChanged: (v) => vm
                  ..fromIso = v
                  ..notifyListeners(),
              ),
            ),
            SizedBox(
              width: 220,
              child: TextField(
                decoration:
                    const InputDecoration(labelText: 'To (yyyy-MM-dd)'),
                onChanged: (v) => vm
                  ..toIso = v
                  ..notifyListeners(),
              ),
            ),
            SizedBox(
              width: 180,
              child: FilledButton.icon(
                onPressed: () => vm.fetchBankTx(1),
                icon: const Icon(Icons.refresh),
                label: const Text('Filter / Refresh'),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          if (vm.txLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(),
              ),
            ),
          if (!vm.txLoading)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('#')),
                  DataColumn(label: Text('Ref Id')),
                  DataColumn(label: Text('Type')),
                  DataColumn(label: Text('Amount')),
                  DataColumn(label: Text('Description')),
                  DataColumn(label: Text('Counter acct')),
                  DataColumn(label: Text('Time')),
                ],
                rows: [
                  if (vm.txRows.isEmpty)
                    const DataRow(cells: [
                      DataCell(Text('—')),
                      DataCell(Text('No transactions')),
                      DataCell(Text('')),
                      DataCell(Text('')),
                      DataCell(Text('')),
                      DataCell(Text('')),
                      DataCell(Text('')),
                    ])
                  else
                    for (int i = 0; i < vm.txRows.length; i++)
                      DataRow(cells: [
                        DataCell(Text(
                            '${(vm.txPage - 1) * 15 + i + 1}')),
                        DataCell(SizedBox(
                          width: 180,
                          child: Text(vm.txRows[i].refId,
                              overflow: TextOverflow.ellipsis),
                        )),
                        DataCell(Chip(label: Text(vm.txRows[i].type))),
                        DataCell(Text(formatVND(vm.txRows[i].amount))),
                        DataCell(SizedBox(
                          width: 240,
                          child: Text(
                            vm.txRows[i].description ?? '',
                            overflow: TextOverflow.ellipsis,
                          ),
                        )),
                        DataCell(Text(vm.txRows[i].counterAccountNo ?? '-')),
                        DataCell(Text(
                            vm.txRows[i].txTime?.toLocal().toString() ?? '-')),
                      ]),
                ],
              ),
            ),
          const SizedBox(height: 8),
          _Pager(
              page: vm.txPage,
              totalPages: vm.txTotalPages,
              onChanged: vm.fetchBankTx),
        ]),
      ),
    );
  }
}

/* ===================== SHARED ===================== */
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          SizedBox(
              width: 160,
              child:
                  Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(child: child),
        ]),
      );
}

class _Copyable extends StatelessWidget {
  const _Copyable({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
            child: Text(text,
                style: const TextStyle(fontWeight: FontWeight.w700))),
        IconButton(
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: text));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã sao chép')));
            }
          },
        ),
      ]);
}

class _Pager extends StatelessWidget {
  const _Pager(
      {required this.page, required this.totalPages, required this.onChanged});
  final int page, totalPages;
  final Future<void> Function(int) onChanged;
  @override
  Widget build(BuildContext context) => Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
                onPressed: page > 1 ? () => onChanged(page - 1) : null,
                icon: const Icon(Icons.chevron_left)),
            Text('$page / $totalPages'),
            IconButton(
                onPressed:
                    page < totalPages ? () => onChanged(page + 1) : null,
                icon: const Icon(Icons.chevron_right)),
          ]);
}

Color _statusColor(TopupStatus s) {
  switch (s) {
    case TopupStatus.PENDING:
      return Colors.amber;
    case TopupStatus.SUCCESS:
      return Colors.green;
    case TopupStatus.FAILED:
      return Colors.red;
    case TopupStatus.CANCELED:
    case TopupStatus.EXPIRED:
      return Colors.grey;
    case TopupStatus.REQUIRES_ACTION:
      return Colors.blue;
  }
}
