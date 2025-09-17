import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/attendance_model.dart';
import 'package:mobile/services/attendance_service.dart';

class MissingCheckoutPage extends StatefulWidget {
  const MissingCheckoutPage({super.key});

  @override
  State<MissingCheckoutPage> createState() => _MissingCheckoutPageState();
}

class _MissingCheckoutPageState extends State<MissingCheckoutPage> {
  bool _loading = false;
  List<Attendance> _items = [];
  DateTime? _fromDate;
  DateTime? _toDate;

  // Dialog state
  Attendance? _selected;
  bool _approve = true;
  final TextEditingController _hrNoteCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _hrNoteCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final from = _fromDate != null
          ? DateFormat('yyyy-MM-dd').format(_fromDate!)
          : '2000-01-01';
      final to = _toDate != null
          ? DateFormat('yyyy-MM-dd').format(_toDate!)
          : '2099-12-31';

      final data = await AttendanceService.getMissingCheckOut(
        fromDate: from,
        toDate: to,
      );
      if (!mounted) return;
      setState(() => _items = data);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tr('submitFailed'))),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }


  Future<void> _pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: (_fromDate != null && _toDate != null)
          ? DateTimeRange(start: _fromDate!, end: _toDate!)
          : null,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
      _fetch();
    }
  }

  void _clearRange() {
    setState(() {
      _fromDate = null;
      _toDate = null;
    });
    _fetch();
  }

  void _openDialog(Attendance a, bool approve) {
    setState(() {
      _selected = a;
      _approve = approve;
      _hrNoteCtrl.text = '';
    });
    showDialog(
      context: context,
      builder: (_) => _buildDialog(),
    );
  }

  Widget _buildDialog() {
    final a = _selected!;
    final inStr = a.checkInTime != null
        ? DateFormat('dd/MM/yyyy HH:mm').format(a.checkInTime!)
        : '-';

    return AlertDialog(
      title: Row(
        children: [
          Icon(_approve ? Icons.check_circle : Icons.cancel,
              color: _approve ? Colors.green : Colors.red),
          const SizedBox(width: 8),
          Text(_approve ? tr('approveExplanation') : tr('rejectExplanation')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.schedule),
            title: Text(tr('checkInTime')),
            subtitle: Text(inStr),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _hrNoteCtrl,
            decoration: InputDecoration(
              labelText: tr('hrNote'),
            ),
            minLines: 3,
            maxLines: 5,
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(tr('cancel'))),
        FilledButton(
          onPressed: _submitting ? null : _resolve,
          child: _submitting
              ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                height: 16,
                width: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 8),
              Text(tr('processing')),
            ],
          )
              : Text(_approve ? tr('approve') : tr('reject')),
        ),
      ],
    );
  }

  Future<void> _resolve() async {
    if (_selected == null) return;
    if (!_approve && _hrNoteCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tr('reasonRequired'))),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await AttendanceService.resolveMissingCheckOut(
        attendanceId: _selected!.id,
        approved: _approve,
        note: _hrNoteCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_approve ? tr('approveSuccess') : tr('rejectSuccess'))),
      );
      Navigator.pop(context); // close dialog
      _fetch(); // refresh list
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tr('submitFailed'))),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _statusShort(Attendance a) {
    final s = a.status.name; // enum to string
    if (s == 'RESOLVED') return tr('resolved');
    if (s == 'REJECTED') return tr('rejected');
    return tr('missing_checkout');
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = (_fromDate != null && _toDate != null)
        ? "${DateFormat('dd/MM/yyyy').format(_fromDate!)} - ${DateFormat('dd/MM/yyyy').format(_toDate!)}"
        : tr('missingCheckoutList');

    return Scaffold(
      appBar: AppBar(title: Text(tr('missingCheckoutReview'))),
      body: Column(
        children: [
          // Filter
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickRange,
                    icon: const Icon(Icons.date_range),
                    label: Text(dateLabel),
                  ),
                ),
                const SizedBox(width: 8),
                if (_fromDate != null && _toDate != null)
                  IconButton(
                    tooltip: tr('cancel'),
                    onPressed: _clearRange,
                    icon: const Icon(Icons.clear),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),

          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                ? Center(child: Text(tr('noData')))
                : ListView.separated(
              itemCount: _items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final a = _items[i];
                final acc = a.account;
                final fullName = [acc.firstName, acc.lastName]
                    .where((s) => (s ?? '').trim().isNotEmpty)
                    .map((s) => s!.trim())
                    .join(' ');
                final displayName = fullName.isNotEmpty ? fullName : (acc.username ?? tr('unknown'));

                final inStr  = a.checkInTime  != null ? DateFormat('dd/MM/yyyy HH:mm').format(a.checkInTime!) : '-';
                final outStr = a.checkOutTime != null ? DateFormat('dd/MM/yyyy HH:mm').format(a.checkOutTime!) : tr('notCheckedOut');

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(child: Icon(Icons.person)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 2),
                                  Text(_statusShort(a), style: const TextStyle(color: Colors.grey)),
                                ],
                              ),
                            ),
                            Text('#${i + 1}'),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.login, size: 16),
                            const SizedBox(width: 6),
                            Text('${tr('checkInTime')}: $inStr'),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.logout, size: 16),
                            const SizedBox(width: 6),
                            Text('${tr('checkOutTime')}: $outStr'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(tr('employeeNote'), style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            a.checkOutEmployeeNote?.trim().isNotEmpty == true
                                ? a.checkOutEmployeeNote!
                                : tr('noExplanation'),
                            style: TextStyle(
                              color: a.checkOutEmployeeNote?.trim().isNotEmpty == true
                                  ? null
                                  : Colors.grey,
                              fontStyle: a.checkOutEmployeeNote?.trim().isNotEmpty == true
                                  ? FontStyle.normal
                                  : FontStyle.italic,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                icon: const Icon(Icons.check_circle),
                                label: Text(tr('approve')),
                                onPressed: () => _openDialog(a, true),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.cancel),
                                label: Text(tr('reject')),
                                onPressed: () => _openDialog(a, false),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
