// UI tiếng Anh; //ghi chú vẫn tiếng Việt
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
  // -------------------- Filters -------------------- (VN) Trạng thái & thời gian lọc
  LeaveStatus? _statusFilter;
  String? _filterMonth; // yyyy-MM
  String? _filterDate; // yyyy-MM-dd
  final TextEditingController _deptNameCtl = TextEditingController();

  // -------------------- List state -------------------- (VN) Phân trang & tải dữ liệu
  final List<LeaveRequest> _items = [];
  int _page = 1;
  final int _pageSize = 10;
  int _totalPages = 1;
  bool _loading = false;
  bool _loadingMore = false;
  bool _hasMore = true;

  // -------------------- Banners -------------------- (VN) Thông báo nhanh
  List<LeaveRequest> _myPending = [];
  List<LeaveRequest> _pendingToApprove = [];

  // -------------------- Insights (Balance + Busy days) -------------------- (VN) Tổng quan
  LeaveBalance? _balance;
  List<BusyDay> _busyDays = [];
  bool _insightsLoading = false;

  final ScrollController _sc = ScrollController();

  // (VN) Ai được phép lọc theo phòng ban
  bool _canFilterDepartment(String? role) =>
      role == 'HR' ||
      role == 'ADMIN' ||
      role == 'SECRETARY' ||
      role == 'MANAGER' ||
      role == 'HOD' ||
      role == 'CHIEFACCOUNTANT';

  @override
  void initState() {
    super.initState();
    _filterMonth = DateFormat('yyyy-MM').format(DateTime.now());
    _boot();
    _sc.addListener(_onScroll);
  }

  @override
  void dispose() {
    _sc.dispose();
    _deptNameCtl.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    await _reload();
    _loadBanners();
    _loadInsights(); // balance + busy days
  }

  // -------------------- Banners -------------------- (VN) Nạp thông báo nhanh
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

  // -------------------- Insights -------------------- (VN) Nạp tổng quan: balance + busy days
  Future<void> _loadInsights() async {
    // (VN) Balance cần month; Busy days cần month + departmentName
    if (_filterMonth == null || _filterMonth!.isEmpty) {
      setState(() {
        _balance = null;
        _busyDays = [];
      });
      return;
    }

    setState(() => _insightsLoading = true);
    try {
      // 1) Leave balance theo tháng
      final map = await LeaveService.getLeaveBalance(_filterMonth!);
      LeaveBalance? lb;
      if (map != null) lb = LeaveBalance.fromJson(map);

      // 2) Busy days theo departmentName (không cần ID)
      List<BusyDay> busy = [];
      final deptName = _deptNameCtl.text.trim();
      if (deptName.isNotEmpty) {
        busy = await _computeBusyDaysByDeptName(
          month: _filterMonth!,
          departmentName: deptName,
        );
      }

      if (!mounted) return;
      setState(() {
        _balance = lb;
        _busyDays = busy;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _balance = null;
        _busyDays = [];
      });
    } finally {
      if (mounted) setState(() => _insightsLoading = false);
    }
  }

  /// (VN) Gom số lượng đơn theo ngày trong tháng (yyyy-MM) dựa trên departmentName
  Future<List<BusyDay>> _computeBusyDaysByDeptName({
    required String month,
    required String departmentName,
  }) async {
    final Map<String, int> counter = {};
    int page = 1;
    int totalPages = 1;
    const int pageSize = 50; // (VN) page to để giảm vòng lặp
    final monthYear = month; // yyyy-MM

    List<String> _datesInRange(String startYmd, String endYmd) {
      DateTime? s = DateTime.tryParse(startYmd);
      DateTime? e = DateTime.tryParse(endYmd);
      if (s == null || e == null) return const [];
      if (e.isBefore(s)) return const [];
      final List<String> res = [];
      for (var d = s; !d.isAfter(e); d = d.add(const Duration(days: 1))) {
        res.add(DateFormat('yyyy-MM-dd').format(d));
      }
      return res;
    }

    List<String> _extractDates(LeaveRequest r) {
      if (r.leaveType == LeaveType.FULL_DAY) {
        if ((r.daysOff ?? []).isNotEmpty) return r.daysOff!;
        if (r.startDate != null && r.endDate != null) {
          return _datesInRange(r.startDate!, r.endDate!);
        }
      }
      if (r.startDate != null) return [r.startDate!]; // half-day, custom-hours
      return const [];
    }

    do {
      final (items, tp) = await LeaveService.getLeaveRequests(
        page: page,
        size: pageSize,
        month: monthYear,
        departmentName: departmentName,
      );
      totalPages = tp;

      for (final r in items) {
        for (final d in _extractDates(r)) {
          if (!d.startsWith(monthYear)) continue; // (VN) chỉ tính trong tháng
          counter[d] = (counter[d] ?? 0) + 1;
        }
      }
      page += 1;
      if (page > 40) break; // (VN) chặn an toàn
    } while (page <= totalPages);

    final sorted = counter.keys.toList()..sort();
    return [for (final d in sorted) BusyDay(date: d, count: counter[d] ?? 0)];
  }

  // -------------------- Fetching list -------------------- (VN) Nạp danh sách đơn
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
        departmentName: _deptNameCtl.text.trim().isEmpty
            ? null
            : _deptNameCtl.text.trim(),
        date: _filterDate,
        month: _filterDate == null ? _filterMonth : null, // (VN) ưu tiên date
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load list: $e')));
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
        departmentName: _deptNameCtl.text.trim().isEmpty
            ? null
            : _deptNameCtl.text.trim(),
        date: _filterDate,
        month: _filterDate == null ? _filterMonth : null,
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load more: $e')));
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

  // -------------------- Filters helpers -------------------- (VN) Hiển thị nhãn lọc
  String _fmtMonth(DateTime d) => DateFormat('yyyy-MM').format(d);
  String _fmtDate(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

  String _statusPillText() {
    if (_statusFilter == null) return 'Status: All';
    switch (_statusFilter!) {
      case LeaveStatus.PENDING:
        return 'Status: Pending';
      case LeaveStatus.PENDING_HR:
        return 'Status: Pending HR';
      case LeaveStatus.APPROVED:
        return 'Status: Approved';
      case LeaveStatus.REJECTED:
        return 'Status: Rejected';
      case LeaveStatus.CANCELLED:
        return 'Status: Cancelled';
      case LeaveStatus.WAITING_TO_CANCEL:
        return 'Status: Waiting to cancel';
      case LeaveStatus.EXPIRED:
        return 'Status: Expired';
    }
  }

  String _advPillText() {
    final parts = <String>[];
    if (_filterMonth != null) parts.add('Month ${_filterMonth!}');
    if (_filterDate != null) parts.add('Date ${_filterDate!}');
    final dept = _deptNameCtl.text.trim();
    if (dept.isNotEmpty) parts.add('Dept: $dept');
    return parts.isEmpty ? 'More filters' : parts.join(' • ');
  }

  void _applyFilters() {
    _reload();
    _loadInsights();
  }

  void _resetFilters() {
    setState(() {
      _statusFilter = null;
      _filterDate = null;
      _filterMonth = DateFormat('yyyy-MM').format(DateTime.now());
      _deptNameCtl.clear();
    });
    _reload();
    _loadInsights();
  }

  // -------------------- Bottom sheets -------------------- (VN) Bộ lọc nhanh
  Future<void> _openStatusFilterSheet() async {
    LeaveStatus? temp = _statusFilter;

    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Select status',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('All'),
                        selected: temp == null,
                        onSelected: (_) => setModal(() => temp = null),
                      ),
                      ChoiceChip(
                        label: const Text('Pending'),
                        selected: temp == LeaveStatus.PENDING,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.PENDING),
                      ),
                      ChoiceChip(
                        label: const Text('Pending HR'),
                        selected: temp == LeaveStatus.PENDING_HR,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.PENDING_HR),
                      ),
                      ChoiceChip(
                        label: const Text('Approved'),
                        selected: temp == LeaveStatus.APPROVED,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.APPROVED),
                      ),
                      ChoiceChip(
                        label: const Text('Rejected'),
                        selected: temp == LeaveStatus.REJECTED,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.REJECTED),
                      ),
                      ChoiceChip(
                        label: const Text('Cancelled'),
                        selected: temp == LeaveStatus.CANCELLED,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.CANCELLED),
                      ),
                      // (VN) Bổ sung trạng thái còn thiếu
                      ChoiceChip(
                        label: const Text('Waiting to cancel'),
                        selected: temp == LeaveStatus.WAITING_TO_CANCEL,
                        onSelected: (_) => setModal(
                          () => temp = LeaveStatus.WAITING_TO_CANCEL,
                        ),
                      ),
                      ChoiceChip(
                        label: const Text('Expired'),
                        selected: temp == LeaveStatus.EXPIRED,
                        onSelected: (_) =>
                            setModal(() => temp = LeaveStatus.EXPIRED),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.pop(ctx, false),
                          icon: const Icon(Icons.close),
                          label: const Text('Close'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => Navigator.pop(ctx, true),
                          icon: const Icon(Icons.check),
                          label: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (applied == true) {
      setState(() => _statusFilter = temp);
      _applyFilters();
    }
  }

  Future<void> _openAdvancedFilterSheet() async {
    String? monthTemp = _filterMonth;
    String? dateTemp = _filterDate;
    final canDept = _canFilterDepartment(
      context.read<AuthProvider>().account?.role,
    );
    final tempCtl = TextEditingController(text: _deptNameCtl.text);

    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'More filters',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final now = DateTime.now();
                            final init = monthTemp == null
                                ? now
                                : DateTime.tryParse('$monthTemp-01') ?? now;
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: init,
                              firstDate: DateTime(now.year - 1, 1, 1),
                              lastDate: DateTime(now.year + 2, 12, 31),
                              helpText: 'Pick any date in the target month',
                            );
                            if (picked != null) {
                              setModal(() {
                                monthTemp = _fmtMonth(picked);
                                dateTemp = null;
                              });
                            }
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Month (yyyy-MM)',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(monthTemp ?? 'Select month'),
                                if (monthTemp != null)
                                  GestureDetector(
                                    onTap: () =>
                                        setModal(() => monthTemp = null),
                                    child: const Icon(Icons.clear, size: 18),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final now = DateTime.now();
                            final init = dateTemp == null
                                ? now
                                : DateTime.tryParse(dateTemp!) ?? now;
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: init,
                              firstDate: DateTime(now.year - 1, 1, 1),
                              lastDate: DateTime(now.year + 2, 12, 31),
                              helpText: 'Select a specific date',
                            );
                            if (picked != null) {
                              setModal(() {
                                dateTemp = _fmtDate(picked);
                                monthTemp = null;
                              });
                            }
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Date (yyyy-MM-dd)',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(dateTemp ?? 'Select date'),
                                if (dateTemp != null)
                                  GestureDetector(
                                    onTap: () =>
                                        setModal(() => dateTemp = null),
                                    child: const Icon(Icons.clear, size: 18),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (canDept)
                    TextField(
                      controller: tempCtl,
                      decoration: const InputDecoration(
                        labelText: 'Department name (keyword)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),

                  if (canDept) const SizedBox(height: 8),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            final now = DateTime.now();
                            setModal(() {
                              monthTemp = DateFormat('yyyy-MM').format(now);
                              dateTemp = null;
                              tempCtl.clear();
                            });
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Reset'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => Navigator.pop(ctx, true),
                          icon: const Icon(Icons.filter_alt),
                          label: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (applied == true) {
      setState(() {
        _filterMonth = monthTemp;
        _filterDate = dateTemp;
        _deptNameCtl.text = tempCtl.text.trim();
      });
      _applyFilters();
    }
  }

  // -------------------- Actions (giữ nguyên logic) --------------------
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
          // (VN) Chỉ trả kết quả, KHÔNG show SnackBar ở đây
          try {
            await LeaveService.create(body);
            return true;
          } catch (_) {
            return false;
          }
        },
      ),
    );

    // (VN) Chỉ 1 nơi show thông báo thành công
    if (ok == true) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      messenger.clearSnackBars();
      messenger.showSnackBar(
        const SnackBar(content: Text('Leave request created')),
      );
      await _reload();
      await _loadInsights();
    }
  }

  Future<void> _approve(int id) async {
    try {
      final sample = await LeaveService.getMySignatureSample();
      if (sample == null || sample.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No saved signature. Please save one in your profile first.',
            ),
          ),
        );
        return;
      }
      await LeaveService.approve(id, signatureBase64: sample);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Approved. Waiting for HR confirmation.')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Approval failed: $e')));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Request rejected.')));
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Reject failed: $e')));
    }
  }

  Future<void> _hrConfirm(int id) async {
    try {
      await LeaveService.hrConfirm(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('HR confirmed. Request APPROVED.')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('HR confirm failed: $e')));
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

  // -------------------- UI helpers -------------------- (VN) Định dạng & label)
  String _fmtDateISO(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  }

  String _humanYMD(String? ymd) {
    if (ymd == null || ymd.isEmpty) return '';
    final parts = ymd.split('-');
    if (parts.length != 3) return ymd;
    return '${parts[2]}/${parts[1]}/${parts[0]}';
  }

  String _typeLabel(LeaveRequest r) {
    switch (r.leaveType) {
      case LeaveType.FULL_DAY:
        if ((r.daysOff ?? []).isNotEmpty) return 'Full-day — split days';
        if (r.startDate != null &&
            r.endDate != null &&
            r.startDate == r.endDate)
          return 'Full-day';
        return 'Full-day — continuous';
      case LeaveType.HALF_DAY_MORNING:
        return 'Half-day (morning)';
      case LeaveType.HALF_DAY_AFTERNOON:
        return 'Half-day (afternoon)';
      case LeaveType.CUSTOM_HOURS:
        return 'Custom hours';
    }
  }

  String _detail(LeaveRequest r) {
    if (r.leaveType == LeaveType.FULL_DAY) {
      if ((r.daysOff ?? []).isNotEmpty) {
        return r.daysOff!.map(_humanYMD).join(', ');
      }
      if (r.startDate != null && r.endDate != null) {
        if (r.startDate == r.endDate) return _humanYMD(r.startDate);
        return '${_humanYMD(r.startDate)} - ${_humanYMD(r.endDate)}';
      }
    }
    if (r.leaveType == LeaveType.HALF_DAY_MORNING) {
      return '${_humanYMD(r.startDate)} · 08:00–12:00';
    }
    if (r.leaveType == LeaveType.HALF_DAY_AFTERNOON) {
      return '${_humanYMD(r.startDate)} · 13:00–17:00';
    }
    if (r.leaveType == LeaveType.CUSTOM_HOURS) {
      final st = r.startTime?.substring(0, 5) ?? '';
      final et = r.endTime?.substring(0, 5) ?? '';
      return '${_humanYMD(r.startDate)} · $st–$et';
    }
    return '-';
  }

  String _nameMini(AccountMini? a) => a?.fullName ?? '-';

  bool _canApprove(LeaveRequest r, String role, int? myId) {
    if (r.status != LeaveStatus.PENDING) return false;
    if (myId == null || r.receiver?.id != myId) return false;

    final senderRole = r.sender?.role ?? '';
    if (role == 'MANAGER') {
      return const {
        'HOD',
        'PM',
        'HR',
        'ADMIN',
        'SECRETARY',
        'CHIEFACCOUNTANT',
      }.contains(senderRole);
    }
    if (role == 'HOD') return senderRole == 'EMPLOYEE';
    if (role == 'CHIEFACCOUNTANT') return senderRole == 'ACCOUNTANT';
    return false;
  }

  bool _canHrConfirm(LeaveRequest r, String role) =>
      role == 'HR' && r.status == LeaveStatus.PENDING_HR;

  String _statusLabel(LeaveStatus s) => s == LeaveStatus.PENDING_HR
      ? 'Pending HR'
      : s.name
            .replaceAll('_', ' ')
            .toLowerCase()
            .split(' ')
            .map(
              (w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}',
            )
            .join(' ');

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
      case LeaveStatus.WAITING_TO_CANCEL:
        return Colors.deepPurple;
      case LeaveStatus.EXPIRED:
        return Colors.brown;
      case LeaveStatus.PENDING:
      default:
        return Colors.orange;
    }
  }

  String _short(String s, [int max = 80]) =>
      s.length > max ? '${s.substring(0, max)}…' : s;

  // -------------------- Build --------------------
  @override
  Widget build(BuildContext context) {
    final role = context.select<AuthProvider, String?>((p) => p.account?.role);
    final myAccountId = context.select<AuthProvider, int?>(
      (p) => p.account?.id,
    );
    final isAdmin = role == 'ADMIN';
    final isManager = role == 'MANAGER';

    return Scaffold(
      appBar: AppBar(title: const Text('Leave Requests')),
      floatingActionButton: (!isManager && !isAdmin)
          ? FloatingActionButton.extended(
              onPressed: _create,
              icon: const Icon(Icons.add),
              label: const Text('Create request'),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ------------- Banners ------------- (VN) Thông báo nhanh)
          if (_myPending.isNotEmpty)
            _InfoAlert(
              message: 'You have ${_myPending.length} request(s) pending',
              buttonLabel: 'View',
              onPressed: () {
                setState(() => _statusFilter = LeaveStatus.PENDING);
                _applyFilters();
              },
            ),
          if ((role == 'MANAGER' ||
                  role == 'HOD' ||
                  role == 'CHIEFACCOUNTANT') &&
              _pendingToApprove.isNotEmpty)
            _InfoAlert(
              message:
                  '${_pendingToApprove.length} request(s) awaiting your approval',
              buttonLabel: 'View',
              onPressed: () {
                setState(() => _statusFilter = LeaveStatus.PENDING);
                _applyFilters();
              },
            ),

          // ------------- Compact filter pills ------------- (VN) Nút lọc nhanh)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openStatusFilterSheet,
                    icon: const Icon(Icons.tune),
                    label: Text(
                      _statusPillText(),
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _openAdvancedFilterSheet,
                    icon: const Icon(Icons.filter_alt),
                    label: Text(
                      _advPillText(),
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ------------- Insights (Balance + Busy days) ------------- (VN) Tổng quan)
          if (_insightsLoading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),

          if (_filterMonth != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: _balance == null
                            ? const Text('Leave balance: (empty)')
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Leave balance — ${_filterMonth!}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Year: limit ${_balance!.limitPerYear}, '
                                    'used ${_balance!.leaveUsedInYear}, '
                                    'left ${_balance!.leaveLeftInYear}',
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Month: limit ${_balance!.limitPerMonth}, '
                                    'used ${_balance!.leaveUsedInMonth}, '
                                    'left ${_balance!.leaveLeftInMonth}',
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          if (_filterMonth != null &&
              _deptNameCtl.text.trim().isNotEmpty &&
              _canFilterDepartment(role))
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
              child: Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Busy days — ${_deptNameCtl.text.trim()} (${_filterMonth!})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      if (_busyDays.isEmpty)
                        const Text('No busy days in this month.'),
                      if (_busyDays.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _busyDays.map((b) {
                            final dd = b.date.split('-').last; // dd
                            return Chip(
                              label: Text('$dd (${b.count})'),
                              avatar: const Icon(Icons.event_busy, size: 18),
                              shape: const StadiumBorder(),
                            );
                          }).toList(),
                        ),
                    ],
                  ),
                ),
              ),
            ),

          const SizedBox(height: 4),

          // ------------- List ------------- (VN) Danh sách đơn)
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await _reload();
                await _loadInsights();
              },
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
                        final canApprove = _canApprove(
                          r,
                          role ?? 'EMPLOYEE',
                          myAccountId,
                        );
                        final canHr = _canHrConfirm(r, role ?? '');

                        return Card(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // LEFT: Info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${_typeLabel(r)} • ${_detail(r)}',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(_short(r.reason)),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Approver: ${_nameMini(r.receiver)} • ${_fmtDateISO(r.createdAt)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
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
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: _statusColor(r.status),
                                        ),
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
                                          case 'preview':
                                            _openPreview(r);
                                            break;
                                          case 'approve':
                                            _approve(r.id);
                                            break;
                                          case 'reject':
                                            _reject(r.id);
                                            break;
                                          case 'hr':
                                            _hrConfirm(r.id);
                                            break;
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(
                                          value: 'preview',
                                          child: Text('Preview'),
                                        ),
                                        if (canApprove)
                                          const PopupMenuItem(
                                            value: 'approve',
                                            child: Text('Approve'),
                                          ),
                                        if (canApprove)
                                          const PopupMenuItem(
                                            value: 'reject',
                                            child: Text('Reject'),
                                          ),
                                        if (canHr)
                                          const PopupMenuItem(
                                            value: 'hr',
                                            child: Text('HR confirm'),
                                          ),
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
  // (VN) Hộp thông báo nổi
  final String message;
  final String buttonLabel;
  final VoidCallback onPressed;
  const _InfoAlert({
    required this.message,
    required this.buttonLabel,
    required this.onPressed,
  });
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
          title: Text(
            message,
            style: const TextStyle(color: Color(0xFF1976D2)),
          ),
          trailing: OutlinedButton(
            onPressed: onPressed,
            child: Text(buttonLabel),
          ),
        ),
      ),
    );
  }
}

// ------------------ Preview content ------------------ (VN) Xem trước nội dung đơn
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
      return 'Days: ${r.daysOff!.map(_formatDate).join(', ')}';
    }
    if (r.leaveType == LeaveType.FULL_DAY &&
        r.startDate != null &&
        r.endDate != null) {
      if (r.startDate == r.endDate)
        return 'Date: ${_formatDate(r.startDate)} (full day)';
      return 'From ${_formatDate(r.startDate)} to ${_formatDate(r.endDate)}';
    }
    if (r.leaveType == LeaveType.HALF_DAY_MORNING) {
      return 'Date: ${_formatDate(r.startDate)} (08:00 - 12:00)';
    }
    if (r.leaveType == LeaveType.HALF_DAY_AFTERNOON) {
      return 'Date: ${_formatDate(r.startDate)} (13:00 - 17:00)';
    }
    if (r.leaveType == LeaveType.CUSTOM_HOURS) {
      return 'Date: ${_formatDate(r.startDate)} (${row.startTime?.substring(0, 5)} - ${row.endTime?.substring(0, 5)})';
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
        const Text(
          'Preview — LEAVE REQUEST',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 12),
        const Text('To: Board of Directors, NEX VIETNAM Co., Ltd.'),
        Text('- ${row.receiver?.fullName ?? ''} (${row.receiver?.role ?? ''})'),
        const SizedBox(height: 8),
        Text('Applicant: ${row.sender?.fullName ?? ''}'),
        const SizedBox(height: 12),
        const Text('I would like to request leave for the following time:'),
        const SizedBox(height: 4),
        Text(_detail(row), style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text(
          'Reason: ${row.reason}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        const Text('Kindly review and approve. Thank you!'),
        const SizedBox(height: 20),
        Row(children: [const Spacer(), Text('Ho Chi Minh City, $createdStr')]),
        const SizedBox(height: 16),
        const Row(
          children: [
            Expanded(child: Center(child: Text('Applicant'))),
            Expanded(child: Center(child: Text('Approver'))),
          ],
        ),
        const SizedBox(height: 40),
        const Row(
          children: [
            Expanded(child: Center(child: Text('(sign & full name)'))),
            Expanded(child: Center(child: Text('(sign & full name)'))),
          ],
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ),
      ],
    );
  }
}

// ------------------ Create form ------------------ (VN) Form tạo đơn mới
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
    if (r == 'HOD' ||
        r == 'PM' ||
        r == 'HR' ||
        r == 'ADMIN' ||
        r == 'SECRETARY' ||
        r == 'CHIEFACCOUNTANT') {
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
        setState(() {
          _loadingApprovers = false;
          approvers = const [];
        });
        return;
      }
      final wantRoles = widget.currentRole == 'ACCOUNTANT'
          ? const ['CHIEFACCOUNTANT']
          : const ['MANAGER'];
      final list = await LeaveService.getAccountsByRoles(wantRoles);
      setState(() {
        approvers = list;
        _loadingApprovers = false;
      });
    } catch (e) {
      setState(() => _loadingApprovers = false);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load approvers: $e')));
    }
  }

  bool _saving = false;

  String _fmtYMD(DateTime? d) =>
      d == null ? 'Select date' : DateFormat('dd/MM/yyyy').format(d);
  String _fmtIso(DateTime d) => DateFormat('yyyy-MM-dd').format(d);
  String _fmtHM(TimeOfDay? t) => t == null
      ? 'Select time'
      : '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

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
          if (endDate == null || endDate!.isBefore(startDate!))
            endDate = picked;
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
    if (picked != null)
      setState(() => start ? startTime = picked : endTime = picked);
  }

  Future<void> _submit() async {
    if (_saving) return;

    if (reasonCtl.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please enter a reason')));
      return;
    }

    if (_needReceiver && receiverId == null) {
      final expect = widget.currentRole == 'ACCOUNTANT'
          ? 'CHIEFACCOUNTANT'
          : 'MANAGER';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select an approver: $expect')),
      );
      return;
    }

    Map<String, dynamic> body;
    if (leaveMode == 'MULTI') {
      if (multiDays.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select at least one day')),
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
          const SnackBar(content: Text('Please select a date range')),
        );
        return;
      }
      if (leaveType == LeaveType.CUSTOM_HOURS &&
          (startTime == null || endTime == null)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select start/end time')),
        );
        return;
      }
      body = {
        'reason': reasonCtl.text.trim(),
        if (_needReceiver) 'receiverId': receiverId,
        'leaveType': leaveType.name,
        'startDate': _fmtIso(startDate!),
        'endDate': _fmtIso(endDate!),
        if (leaveType == LeaveType.CUSTOM_HOURS && startTime != null)
          'startTime': _fmtHM(startTime),
        if (leaveType == LeaveType.CUSTOM_HOURS && endTime != null)
          'endTime': _fmtHM(endTime),
      };
    }

    setState(() => _saving = true);
    final ok = await widget.onSubmit(body);
    if (!mounted) return;
    setState(() => _saving = false);

    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();

    if (ok) {
      // (VN) Thành công -> đóng sheet; màn hình cha sẽ show SnackBar thành công
      Navigator.pop(context, true);
    } else {
      // (VN) Thất bại -> sheet tự báo lỗi, không đóng
      messenger.showSnackBar(
        const SnackBar(content: Text('Create failed. Please try again.')),
      );
    }
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
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[400],
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Create leave request',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),

                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: leaveMode,
                  decoration: const InputDecoration(labelText: 'Leave mode'),
                  items: const [
                    DropdownMenuItem(
                      value: 'RANGE',
                      child: Text('Continuous (start–end)'),
                    ),
                    DropdownMenuItem(
                      value: 'MULTI',
                      child: Text('Split days (multiple)'),
                    ),
                  ],
                  onChanged: (v) => setState(() {
                    leaveMode = v ?? 'RANGE';
                    if (leaveMode == 'MULTI') {
                      leaveType = LeaveType.FULL_DAY;
                      startTime = null;
                      endTime = null;
                    }
                  }),
                ),

                DropdownButtonFormField<LeaveType>(
                  value: leaveType,
                  decoration: const InputDecoration(labelText: 'Leave type'),
                  items: const [
                    DropdownMenuItem(
                      value: LeaveType.FULL_DAY,
                      child: Text('Full day'),
                    ),
                    DropdownMenuItem(
                      value: LeaveType.HALF_DAY_MORNING,
                      child: Text('Half day (morning 08:00–12:00)'),
                    ),
                    DropdownMenuItem(
                      value: LeaveType.HALF_DAY_AFTERNOON,
                      child: Text('Half day (afternoon 13:00–17:00)'),
                    ),
                    DropdownMenuItem(
                      value: LeaveType.CUSTOM_HOURS,
                      child: Text('Custom hours'),
                    ),
                  ],
                  onChanged: leaveMode == 'MULTI'
                      ? null
                      : (v) =>
                            setState(() => leaveType = v ?? LeaveType.FULL_DAY),
                ),

                TextFormField(
                  controller: reasonCtl,
                  maxLength: 800,
                  minLines: 3,
                  maxLines: 8,
                  decoration: const InputDecoration(labelText: 'Reason'),
                ),

                if (_needReceiver)
                  DropdownButtonFormField<int?>(
                    decoration: InputDecoration(
                      labelText:
                          'Approver (${r == 'ACCOUNTANT' ? 'CHIEFACCOUNTANT' : 'MANAGER'})',
                    ),
                    isExpanded: true,
                    items: _loadingApprovers
                        ? const [
                            DropdownMenuItem(
                              value: null,
                              child: Text('Loading...'),
                            ),
                          ]
                        : approvers
                              .map(
                                (a) => DropdownMenuItem(
                                  value: a.id,
                                  child: Text(
                                    '${(a.firstName ?? '')} ${(a.lastName) ?? ''} (${a.role})',
                                  ),
                                ),
                              )
                              .toList(),
                    value: receiverId,
                    onChanged: _loadingApprovers
                        ? null
                        : (v) => setState(() => receiverId = v),
                  ),

                const SizedBox(height: 8),
                if (leaveMode == 'RANGE') ...[
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(start: true),
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'From date',
                              border: OutlineInputBorder(),
                            ),
                            child: Text(_fmtYMD(startDate)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(start: false),
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'To date',
                              border: OutlineInputBorder(),
                            ),
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
                              decoration: const InputDecoration(
                                labelText: 'Start time',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(_fmtHM(startTime)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickTime(start: false),
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'End time',
                                border: OutlineInputBorder(),
                              ),
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
                        label: const Text('Add day'),
                      ),
                      const SizedBox(width: 8),
                      Text('${multiDays.length} day(s) selected'),
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
                        onPressed: _saving
                            ? null
                            : () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(
                                height: 16,
                                width: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Submit request'),
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

// ------------------ Reject reason ------------------ (VN) Nhập lý do từ chối)
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
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Enter a rejection reason',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: ctl,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: 'Reason',
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
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        if (ctl.text.trim().isEmpty) {
                          setState(
                            () => err = 'Please enter a rejection reason!',
                          );
                          return;
                        }
                        Navigator.pop(context, ctl.text.trim());
                      },
                      child: const Text('Reject'),
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
