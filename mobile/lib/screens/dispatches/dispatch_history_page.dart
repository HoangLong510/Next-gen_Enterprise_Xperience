import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/document_history.dart';
import 'package:mobile/services/document_service.dart';

class DispatchHistoryPage extends StatefulWidget {
  final int documentId;
  const DispatchHistoryPage({super.key, required this.documentId});

  @override
  State<DispatchHistoryPage> createState() => _DispatchHistoryPageState();
}

class _DispatchHistoryPageState extends State<DispatchHistoryPage> {
  bool _loading = true;
  String? _error;

  // server pagination
  int _page = 1;
  int _pageSize = 10;
  int _totalPage = 1;
  String _sortBy = 'desc'; // asc | desc

  // data
  List<DocumentHistory> _items = [];

  // client filters
  final _searchCtrl = TextEditingController();
  DateTime? _fromDate;
  DateTime? _toDate;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final (histories, totalPage, _, __) =
      await DocumentService.getDocumentHistoriesPage(
        documentId: widget.documentId,
        pageNumber: _page,
        pageSize: _pageSize,
        sortBy: _sortBy,
      );
      if (!mounted) return;
      setState(() {
        _items = histories;
        _totalPage = totalPage;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: (_fromDate != null && _toDate != null)
          ? DateTimeRange(start: _fromDate!, end: _toDate!)
          : null,
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
    }
  }

  void _clearRange() {
    setState(() { _fromDate = null; _toDate = null; });
  }

  List<DocumentHistory> get _view {
    final q = _searchCtrl.text.trim().toLowerCase();
    final hasQ = q.isNotEmpty;

    bool _inRange(DateTime? d) {
      if (d == null) return true;
      if (_fromDate != null && d.isBefore(DateTime(_fromDate!.year, _fromDate!.month, _fromDate!.day))) return false;
      if (_toDate != null   && d.isAfter(DateTime(_toDate!.year, _toDate!.month, _toDate!.day, 23,59,59))) return false;
      return true;
    }

    return _items.where((h) {
      if (!_inRange(h.createdAt)) return false;
      if (!hasQ) return true;
      final actor = h.createdBy != null
          ? '${h.createdBy!.firstName ?? ''} ${h.createdBy!.lastName ?? ''} ${h.createdBy!.username ?? ''}'
          : '';
      final pool = [
        h.action,
        h.title ?? '',
        h.managerNote ?? '',
        h.content ?? '',
        h.type ?? '',
        h.status ?? '',
        actor,
        h.version.toString(),
      ].join(' ').toLowerCase();
      return pool.contains(q);
    }).toList();
  }

  Widget _row(DocumentHistory h) {
    final created = h.createdAt != null ? DateFormat('HH:mm dd/MM/yyyy').format(h.createdAt!) : '—';
    final actor = () {
      if (h.createdBy == null) return '—';
      final full = '${h.createdBy!.firstName ?? ''} ${h.createdBy!.lastName ?? ''}'.trim();
      return full.isNotEmpty ? full : (h.createdBy!.username ?? '—');
    }();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top line
            Row(
              children: [
                Chip(
                  label: Text('v${h.version}'),
                  visualDensity: VisualDensity.compact,
                ),
                const SizedBox(width: 8),
                Text(h.action, style: const TextStyle(fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(created, style: const TextStyle(color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 8),

            if ((h.title ?? '').isNotEmpty)
              Text(h.title!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            if ((h.title ?? '').isNotEmpty) const SizedBox(height: 6),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if ((h.type ?? '').isNotEmpty)
                  Chip(label: Text('Type: ${h.type}'), visualDensity: VisualDensity.compact),
                if ((h.status ?? '').isNotEmpty)
                  Chip(label: Text('Status: ${h.status}'), visualDensity: VisualDensity.compact),
                Chip(label: Text('By: $actor'), visualDensity: VisualDensity.compact),
              ],
            ),

            if ((h.managerNote ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Manager note:', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(h.managerNote!),
              ),
            ],

            if ((h.projectName ?? '').isNotEmpty || (h.fundName ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              const Divider(),
              if ((h.projectName ?? '').isNotEmpty)
                Text('Project: ${h.projectName}'),
              if ((h.projectDeadline ?? '').isNotEmpty)
                Text('Deadline: ${h.projectDeadline}'),
              if ((h.projectPriority ?? '').isNotEmpty)
                Text('Priority: ${h.projectPriority}'),
              if ((h.fundName ?? '').isNotEmpty)
                Text('Fund: ${h.fundName}'),
              if (h.fundBalance != null)
                Text('Fund balance: ${h.fundBalance}'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _pagination() {
    if (_totalPage <= 1) return const SizedBox.shrink();

    List<Widget> buttons = [];
    buttons.add(IconButton(
      icon: const Icon(Icons.chevron_left),
      onPressed: _page > 1 ? () { setState(() { _page--; }); _fetch(); } : null,
    ));
    for (int i = 1; i <= _totalPage; i++) {
      buttons.add(
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              backgroundColor: i == _page ? Colors.blue : null,
              foregroundColor: i == _page ? Colors.white : null,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            onPressed: () { setState(() { _page = i; }); _fetch(); },
            child: Text('$i'),
          ),
        ),
      );
    }
    buttons.add(IconButton(
      icon: const Icon(Icons.chevron_right),
      onPressed: _page < _totalPage ? () { setState(() { _page++; }); _fetch(); } : null,
    ));

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Wrap(
        alignment: WrapAlignment.center,
        children: buttons,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = (_fromDate != null && _toDate != null)
        ? '${DateFormat('dd/MM/yyyy').format(_fromDate!)} - ${DateFormat('dd/MM/yyyy').format(_toDate!)}'
        : 'Filter by date (optional)';

    return Scaffold(
      appBar: AppBar(title: const Text('Document history')),
      body: Column(
        children: [
          // Filters bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Search action / note / actor / version',
                      prefixIcon: Icon(Icons.search),
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _sortBy,
                  items: const [
                    DropdownMenuItem(value: 'desc', child: Text('Version ↓')),
                    DropdownMenuItem(value: 'asc', child: Text('Version ↑')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() { _sortBy = v; _page = 1; });
                    _fetch();
                  },
                ),
                const SizedBox(width: 8),
                DropdownButton<int>(
                  value: _pageSize,
                  items: const [10, 20, 50]
                      .map((s) => DropdownMenuItem(value: s, child: Text('Size $s')))
                      .toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() { _pageSize = v; _page = 1; });
                    _fetch();
                  },
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _pickRange,
                  icon: const Icon(Icons.date_range),
                  label: Text(dateLabel),
                ),
                if (_fromDate != null && _toDate != null) ...[
                  const SizedBox(width: 4),
                  IconButton(onPressed: _clearRange, icon: const Icon(Icons.clear)),
                ],
                const SizedBox(width: 8),
                IconButton(onPressed: _fetch, icon: const Icon(Icons.refresh)),
              ],
            ),
          ),
          const Divider(height: 1),

          // Body
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(child: Text('Error: $_error'))
                : _view.isEmpty
                ? const Center(child: Text('No histories'))
                : ListView.builder(
              itemCount: _view.length,
              itemBuilder: (_, i) => _row(_view[i]),
            ),
          ),

          _pagination(),
        ],
      ),
    );
  }
}
