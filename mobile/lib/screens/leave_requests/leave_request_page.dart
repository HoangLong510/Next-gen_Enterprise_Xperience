import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import 'package:mobile/models/leave_request.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/services/leave_service.dart';

class LeaveRequestPage extends StatefulWidget {
  const LeaveRequestPage({super.key});
  @override
  State<LeaveRequestPage> createState() => _LeaveRequestPageState();
}

class _LeaveRequestPageState extends State<LeaveRequestPage> {
  LeaveStatus? _statusFilter;
  final List<LeaveRequest> _items = [];
  int _page = 1;
  final int _pageSize = 10;
  int _totalPages = 1;
  bool _loading = false;
  bool _loadingMore = false;
  bool _hasMore = true;

  List<LeaveRequest> _myPending = [];
  List<LeaveRequest> _pendingToApprove = [];

  final ScrollController _sc = ScrollController();

  @override
  void initState() {
    super.initState();
    _boot();
    _sc.addListener(_onScroll);
  }

  @override
  void dispose() {
    _sc.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    await _reload();
    _loadBanners();
  }

  Future<void> _loadBanners() async {
    try {
      final my = await LeaveService.getMyPending();
      final toApprove = await LeaveService.getPendingToApprove();
      if (!mounted) return;
      setState(() {
        _myPending = my;
        _pendingToApprove = toApprove;
      });
    } catch (_) {}
  }

  // ---------- Fetching ----------
  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _page = 1;
      _hasMore = true;
    });
    try {
      final (items, totalPages) = await LeaveService.getLeaveRequests(
        status: _statusFilter?.name,
        page: _page,
        size: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(items);
        _totalPages = totalPages;
        _hasMore = _page < _totalPages;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi tải danh sách: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final (items, totalPages) = await LeaveService.getLeaveRequests(
        status: _statusFilter?.name,
        page: next,
        size: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _page = next;
        _totalPages = totalPages;
        _items.addAll(items);
        _hasMore = _page < _totalPages;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi tải thêm: $e')),
      );
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore) return;
    if (_sc.position.pixels >= _sc.position.maxScrollExtent - 160) {
      _loadMore();
    }
  }

  // ---------- Actions ----------
  Future<void> _create() async {
    final role = context.read<AuthProvider>().account?.role ?? 'EMPLOYEE';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _CreateFormSheet(
        currentRole: role,
        onSubmit: (body) async {
          try {
            await LeaveService.create(body);
            if (!mounted) return false;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã tạo đơn nghỉ')),
            );
            return true;
          } catch (e) {
            if (!mounted) return false;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Tạo đơn thất bại: $e')),
            );
            return false;
          }
        },
      ),
    );
    if (ok == true) _reload();
  }

  Future<void> _approve(int id) async {
    try {
      final sample = await LeaveService.getMySignatureSample();
      if (sample == null || sample.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bạn chưa lưu chữ ký mẫu. Vào hồ sơ để lưu trước.')),
        );
        return;
      }
      await LeaveService.approve(id, signatureBase64: sample);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã ký duyệt. Đơn đang chờ HR xác nhận.')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Duyệt thất bại: $e')),
      );
    }
  }

  Future<void> _reject(int id) async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => const _RejectReasonSheet(),
    );
    if (reason == null || reason.isEmpty) return;
    try {
      await LeaveService.reject(id, reason: reason);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã từ chối đơn.')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Từ chối thất bại: $e')),
      );
    }
  }

  Future<void> _hrConfirm(int id) async {
    try {
      await LeaveService.hrConfirm(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('HR đã xác nhận. Đơn APPROVED.')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xác nhận HR thất bại: $e')),
      );
    }
  }

  void _openPreview(LeaveRequest r) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.9,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (ctx, controller) => SingleChildScrollView(
          controller: controller,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: _PreviewContent(row: r),
          ),
        ),
      ),
    );
  }

  // ---------- UI helpers ----------
  String _fmtDateISO(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  }

  String _formatDate(String? ymd) {
    if (ymd == null || ymd.isEmpty) return '';
    final parts = ymd.split('-');
    if (parts.length != 3) return ymd;
    return '${parts[2]}/${parts[1]}/${parts[0]}';
  }

  String _typeLabel(LeaveRequest r) {
    switch (r.leaveType) {
      case LeaveType.FULL_DAY:
        if ((r.daysOff ?? []).isNotEmpty) return 'Nghỉ ngắt quãng';
        if (r.startDate != null && r.endDate != null && r.startDate == r.endDate) return 'Nghỉ 1 ngày';
        return 'Nghỉ liên tục';
      case LeaveType.HALF_DAY_MORNING:
        return 'Nửa ngày sáng';
      case LeaveType.HALF_DAY_AFTERNOON:
        return 'Nửa ngày chiều';
      case LeaveType.CUSTOM_HOURS:
        return 'Nghỉ theo giờ';
    }
  }

  String _detail(LeaveRequest r) {
    if (r.leaveType == LeaveType.FULL_DAY) {
      if ((r.daysOff ?? []).isNotEmpty) {
        return r.daysOff!.map(_formatDate).join(', ');
      }
      if (r.startDate != null && r.endDate != null) {
        if (r.startDate == r.endDate) return _formatDate(r.startDate);
        return '${_formatDate(r.startDate)} - ${_formatDate(r.endDate)}';
      }
    }
    if (r.leaveType == LeaveType.HALF_DAY_MORNING) {
      return '${_formatDate(r.startDate)} · 8:00–12:00';
    }
    if (r.leaveType == LeaveType.HALF_DAY_AFTERNOON) {
      return '${_formatDate(r.startDate)} · 13:00–17:00';
    }
    if (r.leaveType == LeaveType.CUSTOM_HOURS) {
      final st = r.startTime?.substring(0, 5) ?? '';
      final et = r.endTime?.substring(0, 5) ?? '';
      return '${_formatDate(r.startDate)} · $st–$et';
    }
    return '-';
  }

  String _nameMini(AccountMini? a) => a?.fullName ?? '-';

  bool _canApprove(LeaveRequest r, String role, int? myId) {
    if (r.status != LeaveStatus.PENDING) return false;
    if (myId == null || r.receiver?.id != myId) return false;

    final senderRole = r.sender?.role ?? '';
    if (role == 'MANAGER') {
      return const {'HOD','PM','HR','ADMIN','SECRETARY','CHIEFACCOUNTANT'}.contains(senderRole);
    }
    if (role == 'HOD') return senderRole == 'EMPLOYEE';
    if (role == 'CHIEFACCOUNTANT') return senderRole == 'ACCOUNTANT';
    return false;
  }

  bool _canHrConfirm(LeaveRequest r, String role) =>
      role == 'HR' && r.status == LeaveStatus.PENDING_HR;

  String _statusLabel(LeaveStatus s) =>
      s == LeaveStatus.PENDING_HR ? 'Chờ HR' : s.name.replaceAll('_', ' ');

  Color _statusColor(LeaveStatus s) {
    switch (s) {
      case LeaveStatus.APPROVED:
        return Colors.green;
      case LeaveStatus.REJECTED:
        return Colors.red;
      case LeaveStatus.PENDING_HR:
        return Colors.blueGrey;
      case LeaveStatus.CANCELLED:
        return Colors.grey;
      case LeaveStatus.PENDING:
      default:
        return Colors.orange;
    }
  }

  String _short(String s, [int max = 80]) =>
      s.length > max ? '${s.substring(0, max)}…' : s;

  // ---------- Build ----------
  @override
  Widget build(BuildContext context) {
    final role = context.select<AuthProvider, String?>((p) => p.account?.role);
    final myAccountId = context.select<AuthProvider, int?>((p) => p.account?.id);
    final isAdmin = role == 'ADMIN';
    final isManager = role == 'MANAGER';

    return Scaffold(
      appBar: AppBar(title: const Text('Đơn nghỉ phép')),
      floatingActionButton: (!isManager && !isAdmin)
          ? FloatingActionButton.extended(
              onPressed: _create,
              icon: const Icon(Icons.add),
              label: const Text('Tạo đơn'),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_myPending.isNotEmpty)
            _InfoAlert(
              message: 'Bạn có ${_myPending.length} đơn đang chờ được duyệt',
              buttonLabel: 'Xem',
              onPressed: () {
                setState(() => _statusFilter = LeaveStatus.PENDING);
                _reload();
              },
            ),
          if ((role == 'MANAGER' || role == 'HOD' || role == 'CHIEFACCOUNTANT') && _pendingToApprove.isNotEmpty)
            _InfoAlert(
              message: 'Có ${_pendingToApprove.length} đơn chờ bạn duyệt',
              buttonLabel: 'Xem',
              onPressed: () {
                setState(() => _statusFilter = LeaveStatus.PENDING);
                _reload();
              },
            ),

          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Tất cả'),
                  selected: _statusFilter == null,
                  onSelected: (_) { setState(() => _statusFilter = null); _reload(); },
                ),
                ChoiceChip(
                  label: const Text('Chờ duyệt'),
                  selected: _statusFilter == LeaveStatus.PENDING,
                  onSelected: (_) { setState(() => _statusFilter = LeaveStatus.PENDING); _reload(); },
                ),
                ChoiceChip(
                  label: const Text('Chờ HR'),
                  selected: _statusFilter == LeaveStatus.PENDING_HR,
                  onSelected: (_) { setState(() => _statusFilter = LeaveStatus.PENDING_HR); _reload(); },
                ),
                ChoiceChip(
                  label: const Text('Đã duyệt'),
                  selected: _statusFilter == LeaveStatus.APPROVED,
                  onSelected: (_) { setState(() => _statusFilter = LeaveStatus.APPROVED); _reload(); },
                ),
                ChoiceChip(
                  label: const Text('Từ chối'),
                  selected: _statusFilter == LeaveStatus.REJECTED,
                  onSelected: (_) { setState(() => _statusFilter = LeaveStatus.REJECTED); _reload(); },
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: RefreshIndicator(
              onRefresh: _reload,
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _sc,
                      itemCount: _items.length + (_hasMore ? 1 : 0),
                      itemBuilder: (ctx, i) {
                        if (i == _items.length) {
                          return const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        final r = _items[i];
                        final canApprove = _canApprove(r, role ?? 'EMPLOYEE', myAccountId);
                        final canHr = _canHrConfirm(r, role ?? '');

                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // LEFT: Info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Title line
                                      Text(
                                        '${_typeLabel(r)} • ${_detail(r)}',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(_short(r.reason)),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Người duyệt: ${_nameMini(r.receiver)} • ${_fmtDateISO(r.createdAt)}',
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // RIGHT: Status + menu
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: _statusColor(r.status)),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Text(
                                        _statusLabel(r.status),
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    PopupMenuButton<String>(
                                      padding: EdgeInsets.zero,
                                      onSelected: (v) {
                                        switch (v) {
                                          case 'preview': _openPreview(r); break;
                                          case 'approve': _approve(r.id); break;
                                          case 'reject': _reject(r.id); break;
                                          case 'hr': _hrConfirm(r.id); break;
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(value: 'preview', child: Text('Xem trước')),
                                        if (canApprove) const PopupMenuItem(value: 'approve', child: Text('Duyệt')),
                                        if (canApprove) const PopupMenuItem(value: 'reject', child: Text('Từ chối')),
                                        if (canHr) const PopupMenuItem(value: 'hr', child: Text('HR xác nhận')),
                                      ],
                                      icon: const Icon(Icons.more_vert),
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
          ),
        ],
      ),
    );
  }
}

class _InfoAlert extends StatelessWidget {
  final String message;
  final String buttonLabel;
  final VoidCallback onPressed;
  const _InfoAlert({required this.message, required this.buttonLabel, required this.onPressed});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Material(
        color: const Color(0xFFE3F2FD),
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: Color(0xFF90CAF9)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListTile(
          leading: const Icon(Icons.info_outline, color: Color(0xFF1976D2)),
          title: Text(message, style: const TextStyle(color: Color(0xFF1976D2))),
          trailing: OutlinedButton(onPressed: onPressed, child: Text(buttonLabel)),
        ),
      ),
    );
  }
}

// ------------------ Preview content ------------------
class _PreviewContent extends StatelessWidget {
  final LeaveRequest row;
  const _PreviewContent({required this.row});

  String _formatDate(String? ymd) {
    if (ymd == null) return '';
    final p = ymd.split('-');
    if (p.length != 3) return ymd;
    return '${p[2]}/${p[1]}/${p[0]}';
  }

  String _detail(LeaveRequest r) {
    if (r.leaveType == LeaveType.FULL_DAY && (r.daysOff ?? []).isNotEmpty) {
      return 'Các ngày: ${r.daysOff!.map(_formatDate).join(', ')}';
    }
    if (r.leaveType == LeaveType.FULL_DAY && r.startDate != null && r.endDate != null) {
      if (r.startDate == r.endDate) return 'Ngày ${_formatDate(r.startDate)} (cả ngày)';
      return 'Từ ngày ${_formatDate(r.startDate)} đến hết ngày ${_formatDate(r.endDate)}';
    }
    if (r.leaveType == LeaveType.HALF_DAY_MORNING) {
      return 'Ngày ${_formatDate(r.startDate)} (8:00 - 12:00)';
    }
    if (r.leaveType == LeaveType.HALF_DAY_AFTERNOON) {
      return 'Ngày ${_formatDate(r.startDate)} (13:00 - 17:00)';
    }
    if (r.leaveType == LeaveType.CUSTOM_HOURS) {
      return 'Ngày ${_formatDate(r.startDate)} (${row.startTime?.substring(0, 5)} - ${row.endTime?.substring(0, 5)})';
    }
    return '-';
  }

  @override
  Widget build(BuildContext context) {
    final createdStr = row.createdAt == null
        ? ''
        : DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(row.createdAt!));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Xem trước ĐƠN XIN NGHỈ PHÉP',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 12),
        const Text('Kính gửi: Ban Giám Đốc Công ty TNHH NEX VIETNAM'),
        Text('- ${row.receiver?.fullName ?? ''} (${row.receiver?.role ?? ''})'),
        const SizedBox(height: 8),
        Text('Tôi tên là: ${row.sender?.fullName ?? ''}'),
        const SizedBox(height: 12),
        const Text('Nay tôi làm đơn này kính xin cho tôi được nghỉ trong thời gian:'),
        const SizedBox(height: 4),
        Text(_detail(row), style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text('Lý do: ${row.reason}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        const Text('Kính mong công ty xem xét và tạo điều kiện. Xin cảm ơn!'),
        const SizedBox(height: 20),
        Row(children: [const Spacer(), Text('Hồ Chí Minh, $createdStr')]),
        const SizedBox(height: 16),
        const Row(
          children: [
            Expanded(child: Center(child: Text('Người làm đơn'))),
            Expanded(child: Center(child: Text('Người phụ trách'))),
          ],
        ),
        const SizedBox(height: 40),
        const Row(
          children: [
            Expanded(child: Center(child: Text('(ký và ghi rõ họ tên)'))),
            Expanded(child: Center(child: Text('(ký và ghi rõ họ tên)'))),
          ],
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ),
      ],
    );
  }
}

// ------------------ Create form ------------------
class _CreateFormSheet extends StatefulWidget {
  final String currentRole;
  final Future<bool> Function(Map<String, dynamic> body) onSubmit;
  const _CreateFormSheet({required this.currentRole, required this.onSubmit});

  @override
  State<_CreateFormSheet> createState() => _CreateFormSheetState();
}

class _CreateFormSheetState extends State<_CreateFormSheet> {
  List<Account> approvers = [];
  bool _loadingApprovers = true;

  String leaveMode = 'RANGE';
  LeaveType leaveType = LeaveType.FULL_DAY;
  final TextEditingController reasonCtl = TextEditingController();
  int? receiverId;

  DateTime? startDate;
  DateTime? endDate;
  final List<DateTime> multiDays = [];
  TimeOfDay? startTime;
  TimeOfDay? endTime;

  bool get _needReceiver {
    final r = widget.currentRole;
    if (r == 'ACCOUNTANT') return true;
    if (r == 'HOD' || r == 'PM' || r == 'HR' || r == 'ADMIN' || r == 'SECRETARY' || r == 'CHIEFACCOUNTANT') {
      return true;
    }
    return false; // EMPLOYEE
  }

  @override
  void initState() {
    super.initState();
    _loadApprovers();
  }

  Future<void> _loadApprovers() async {
    try {
      if (!_needReceiver) {
        setState(() { _loadingApprovers = false; approvers = const []; });
        return;
      }
      final wantRoles = widget.currentRole == 'ACCOUNTANT'
          ? const ['CHIEFACCOUNTANT']
          : const ['MANAGER'];
      final list = await LeaveService.getAccountsByRoles(wantRoles);
      setState(() { approvers = list; _loadingApprovers = false; });
    } catch (e) {
      setState(() => _loadingApprovers = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Không tải được người duyệt: $e')),
      );
    }
  }

  bool _saving = false;

  String _fmtYMD(DateTime? d) =>
      d == null ? 'Chọn ngày' : DateFormat('dd/MM/yyyy').format(d);
  String _fmtIso(DateTime d) => DateFormat('yyyy-MM-dd').format(d);
  String _fmtHM(TimeOfDay? t) =>
      t == null ? 'Chọn giờ' : '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _pickDate({required bool start}) async {
    final now = DateTime.now();
    final init = start ? (startDate ?? now) : (endDate ?? startDate ?? now);
    final picked = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) {
      setState(() {
        if (start) {
          startDate = picked;
          if (endDate == null || endDate!.isBefore(startDate!)) endDate = picked;
        } else {
          endDate = picked;
        }
      });
    }
  }

  Future<void> _pickMulti() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) setState(() => multiDays.add(picked));
  }

  Future<void> _pickTime({required bool start}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) setState(() => start ? startTime = picked : endTime = picked);
  }

  Future<void> _submit() async {
    if (_saving) return;

    if (reasonCtl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập lý do')),
      );
      return;
    }

    if (_needReceiver && receiverId == null) {
      final expect = widget.currentRole == 'ACCOUNTANT' ? 'CHIEFACCOUNTANT' : 'MANAGER';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bạn phải chọn người duyệt là $expect')),
      );
      return;
    }

    Map<String, dynamic> body;
    if (leaveMode == 'MULTI') {
      if (multiDays.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chọn ít nhất 1 ngày')),
        );
        return;
      }
      body = {
        'reason': reasonCtl.text.trim(),
        if (_needReceiver) 'receiverId': receiverId,
        'leaveType': LeaveType.FULL_DAY.name,
        'days': multiDays.map(_fmtIso).toList(),
      };
    } else {
      if (startDate == null || endDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chọn khoảng ngày')),
        );
        return;
      }
      body = {
        'reason': reasonCtl.text.trim(),
        if (_needReceiver) 'receiverId': receiverId,
        'leaveType': leaveType.name,
        'startDate': _fmtIso(startDate!),
        'endDate': _fmtIso(endDate!),
        if (leaveType == LeaveType.CUSTOM_HOURS && startTime != null) 'startTime': _fmtHM(startTime),
        if (leaveType == LeaveType.CUSTOM_HOURS && endTime != null) 'endTime': _fmtHM(endTime),
      };
    }

    setState(() => _saving = true);
    final ok = await widget.onSubmit(body);
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final r = widget.currentRole;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(99)),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Tạo đơn nghỉ phép', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),

                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: leaveMode,
                  decoration: const InputDecoration(labelText: 'Kiểu nghỉ phép'),
                  items: const [
                    DropdownMenuItem(value: 'RANGE', child: Text('Nghỉ liên tục (start-end)')),
                    DropdownMenuItem(value: 'MULTI', child: Text('Nghỉ ngắt quãng (nhiều ngày)')),
                  ],
                  onChanged: (v) => setState(() {
                    leaveMode = v ?? 'RANGE';
                    if (leaveMode == 'MULTI') {
                      leaveType = LeaveType.FULL_DAY;
                      startTime = null; endTime = null;
                    }
                  }),
                ),

                DropdownButtonFormField<LeaveType>(
                  value: leaveType,
                  decoration: const InputDecoration(labelText: 'Loại nghỉ phép'),
                  items: const [
                    DropdownMenuItem(value: LeaveType.FULL_DAY, child: Text('Nghỉ cả ngày')),
                    DropdownMenuItem(value: LeaveType.HALF_DAY_MORNING, child: Text('Nửa ngày sáng (8:00-12:00)')),
                    DropdownMenuItem(value: LeaveType.HALF_DAY_AFTERNOON, child: Text('Nửa ngày chiều (13:00-17:00)')),
                    DropdownMenuItem(value: LeaveType.CUSTOM_HOURS, child: Text('Nghỉ theo giờ')),
                  ],
                  onChanged: leaveMode == 'MULTI' ? null : (v) => setState(() => leaveType = v ?? LeaveType.FULL_DAY),
                ),

                TextFormField(
                  controller: reasonCtl,
                  maxLength: 800,
                  minLines: 3,
                  maxLines: 8,
                  decoration: const InputDecoration(labelText: 'Lý do'),
                ),

                if (_needReceiver)
                  DropdownButtonFormField<int?>(
                    decoration: InputDecoration(
                      labelText: 'Người duyệt (${r == 'ACCOUNTANT' ? 'CHIEFACCOUNTANT' : 'MANAGER'})',
                    ),
                    isExpanded: true,
                    items: _loadingApprovers
                        ? const [DropdownMenuItem(value: null, child: Text('Đang tải...'))]
                        : approvers
                            .map((a) => DropdownMenuItem(
                                  value: a.id,
                                  child: Text('${(a.firstName ?? '')} ${(a.lastName) ?? ''} (${a.role})'),
                                ))
                            .toList(),
                    value: receiverId,
                    onChanged: _loadingApprovers ? null : (v) => setState(() => receiverId = v),
                  ),

                const SizedBox(height: 8),
                if (leaveMode == 'RANGE') ...[
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(start: true),
                          child: InputDecorator(
                            decoration: const InputDecoration(labelText: 'Từ ngày', border: OutlineInputBorder()),
                            child: Text(_fmtYMD(startDate)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(start: false),
                          child: InputDecorator(
                            decoration: const InputDecoration(labelText: 'Đến ngày', border: OutlineInputBorder()),
                            child: Text(_fmtYMD(endDate)),
                          ),
                        ),
                      ),
                    ],
                  ),

                  if (leaveType == LeaveType.CUSTOM_HOURS) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickTime(start: true),
                            child: InputDecorator(
                              decoration: const InputDecoration(labelText: 'Giờ bắt đầu', border: OutlineInputBorder()),
                              child: Text(_fmtHM(startTime)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickTime(start: false),
                            child: InputDecorator(
                              decoration: const InputDecoration(labelText: 'Giờ kết thúc', border: OutlineInputBorder()),
                              child: Text(_fmtHM(endTime)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],

                if (leaveMode == 'MULTI') ...[
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _pickMulti,
                        icon: const Icon(Icons.add),
                        label: const Text('Thêm ngày'),
                      ),
                      const SizedBox(width: 8),
                      Text('${multiDays.length} ngày đã chọn'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final d in multiDays)
                        Chip(
                          label: Text(_fmtYMD(d)),
                          onDeleted: () => setState(() => multiDays.remove(d)),
                        ),
                    ],
                  ),
                ],

                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _saving ? null : () => Navigator.pop(context, false),
                        child: const Text('Hủy'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Gửi đơn'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ------------------ Reject reason ------------------
class _RejectReasonSheet extends StatefulWidget {
  const _RejectReasonSheet();
  @override
  State<_RejectReasonSheet> createState() => _RejectReasonSheetState();
}

class _RejectReasonSheetState extends State<_RejectReasonSheet> {
  final TextEditingController ctl = TextEditingController();
  String? err;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(99)),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Nhập lý do từ chối', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: ctl,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: 'Lý do từ chối',
                  border: const OutlineInputBorder(),
                  errorText: err,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Hủy'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        if (ctl.text.trim().isEmpty) {
                          setState(() => err = 'Bạn phải nhập lý do từ chối!');
                          return;
                        }
                        Navigator.pop(context, ctl.text.trim());
                      },
                      child: const Text('Từ chối'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
