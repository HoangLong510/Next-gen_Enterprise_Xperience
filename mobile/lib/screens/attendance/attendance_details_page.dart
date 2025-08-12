import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/attendance_model.dart';
import 'package:mobile/models/enums/attendance_status.dart';
import 'package:mobile/services/attendance_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:provider/provider.dart';

class AttendanceDetailPage extends StatefulWidget {
  final int attendanceId;
  const AttendanceDetailPage({super.key, required this.attendanceId});

  @override
  State<AttendanceDetailPage> createState() => _AttendanceDetailPageState();
}

class _AttendanceDetailPageState extends State<AttendanceDetailPage> {
  Attendance? _attendance;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final att = await AttendanceService.getAttendanceById(widget.attendanceId);
      setState(() => _attendance = att);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _hrResolve(bool approved) async {
    final att = _attendance;
    if (att == null) return;

    final controller = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(approved ? 'Duyệt ghi chú' : 'Từ chối ghi chú'),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'Nhập ghi chú quyết định',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Xác nhận')),
        ],
      ),
    );
    if (note == null) return;

    // Bắt buộc nhập ghi chú khi từ chối
    if (!approved && note.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập lý do khi từ chối'), backgroundColor: Colors.red),
      );
      return;
    }

    try {
      final updated = await AttendanceService.resolveMissingCheckOut(
        attendanceId: att.id,
        note: note,
        approved: approved,
      );
      setState(() => _attendance = updated);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(approved ? 'Đã duyệt ghi chú' : 'Đã từ chối ghi chú'),
          backgroundColor: approved ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _submitNoteDialog() async {
    final att = _attendance;
    if (att == null) return;

    final controller = TextEditingController(text: att.checkOutEmployeeNote ?? '');
    final note = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Gửi ghi chú thiếu check-out'),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'Nhập lý do/ghi chú... (bắt buộc)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          FilledButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            child: const Text('Gửi'),
          ),
        ],
      ),
    );

    if (note == null || note.isEmpty) return;

    try {
      final updated = await AttendanceService.submitMissingCheckOutNote(
        attendanceId: att.id,
        note: note,
      );
      setState(() => _attendance = updated);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã gửi/ cập nhật ghi chú'), backgroundColor: Colors.green),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gửi ghi chú thất bại: $e'), backgroundColor: Colors.red),
      );
    }
  }

  String _fmtDate(DateTime? dt) {
    if (dt == null) return '-';
    return DateFormat('HH:mm dd/MM/yyyy').format(dt);
  }

  Widget _statusChip(AttendanceStatus s) {
    Color bg; Color fg; IconData ic;
    switch (s) {
      case AttendanceStatus.CHECKED_IN:
        bg = Colors.orange.shade50; fg = Colors.orange; ic = Icons.login;
        break;
      case AttendanceStatus.CHECKED_OUT:
        bg = Colors.green.shade50; fg = Colors.green; ic = Icons.logout;
        break;
      case AttendanceStatus.MISSING_CHECKOUT:
        bg = Colors.red.shade50; fg = Colors.red; ic = Icons.warning_amber_rounded;
        break;
      case AttendanceStatus.RESOLVED:
        bg = Colors.blue.shade50; fg = Colors.blue; ic = Icons.task_alt;
        break;
      case AttendanceStatus.REJECTED:
        bg = Colors.grey.shade200; fg = Colors.grey.shade700; ic = Icons.block;
        break;
      case AttendanceStatus.NOT_CHECKED_IN:
      default:
        bg = Colors.grey.shade100; fg = Colors.grey; ic = Icons.help_outline;
    }
    return Chip(
      avatar: Icon(ic, size: 18, color: fg),
      label: Text(s.name),
      backgroundColor: bg,
      side: BorderSide(color: fg.withOpacity(.3)),
      labelStyle: TextStyle(color: fg, fontWeight: FontWeight.w600),
    );
  }

  Widget _kv(String label, String value, {IconData? icon}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (icon != null) ...[
        Icon(icon, size: 18, color: Colors.grey[700]),
        const SizedBox(width: 8),
      ],
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    ],
  );

  Widget _boolRow(String text, bool? v, {IconData ok = Icons.check_circle, IconData bad = Icons.cancel}) {
    final isOk = v == true;
    return Row(
      children: [
        Icon(isOk ? ok : bad, color: isOk ? Colors.green : Colors.red),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 15)),
      ],
    );
  }

  Widget _imageTile(String title, String? path) {
    if (path == null || path.isEmpty) return const SizedBox.shrink();

    final base = (dotenv.env["API_URL"] ?? "").replaceFirst(RegExp(r'/$'), '');
    final url  = path.startsWith('http')
        ? path
        : '$base/${path.replaceAll('\\', '/')}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black12,
              child: Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final role = context.watch<AuthProvider>().account?.role;

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết chấm công')),
      body: RefreshIndicator(
        onRefresh: _fetch,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? ListView(children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Lỗi tải dữ liệu: $_error'),
          )
        ])
            : _attendance == null
            ? ListView(children: const [
          Padding(
            padding: EdgeInsets.all(16),
            child: Text('Không tìm thấy bản ghi'),
          )
        ])
            : ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header + status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Thông tin chung', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                _statusChip(_attendance!.status),
              ],
            ),
            const SizedBox(height: 12),

            // Thông tin chung
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _kv('Check-in lúc', _fmtDate(_attendance!.checkInTime), icon: Icons.login),
                    const SizedBox(height: 10),
                    _kv('Check-out lúc', _fmtDate(_attendance!.checkOutTime), icon: Icons.logout),
                    const Divider(height: 24),
                    if (_attendance!.distanceKm != null)
                      _kv('Khoảng cách (km)', _attendance!.distanceKm!.toStringAsFixed(2), icon: Icons.place),
                    const SizedBox(height: 8),
                    _boolRow('Vị trí hợp lệ', _attendance!.locationValid),
                    const SizedBox(height: 8),
                    _boolRow('Khuôn mặt khớp', _attendance!.faceMatch, ok: Icons.verified, bad: Icons.error_outline),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            _imageTile('Ảnh check-in', _attendance!.checkInImagePath),
            const SizedBox(height: 12),
            _imageTile('Ảnh check-out', _attendance!.checkOutImagePath),

            const SizedBox(height: 16),

            // Ghi chú thiếu checkout (nhân viên)
            if (_attendance!.status == AttendanceStatus.MISSING_CHECKOUT)
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 1,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.note_alt_outlined),
                          SizedBox(width: 8),
                          Text('Ghi chú giải trình', style: TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if ((_attendance!.checkOutEmployeeNote ?? '').isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(_attendance!.checkOutEmployeeNote!),
                        )
                      else
                        const Text('Chưa có ghi chú'),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: OutlinedButton.icon(
                          onPressed: _submitNoteDialog,
                          icon: const Icon(Icons.send),
                          label: Text((_attendance!.checkOutEmployeeNote ?? '').isNotEmpty ? 'Cập nhật ghi chú' : 'Gửi ghi chú'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Kết quả HR (hiện khi đã có quyết định hoặc note HR)
            if (_attendance!.status == AttendanceStatus.RESOLVED ||
                _attendance!.status == AttendanceStatus.REJECTED ||
                _attendance!.hrDecision != null ||
                (_attendance!.checkOutHrNote ?? '').isNotEmpty)
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 1,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.verified_user_outlined),
                          SizedBox(width: 8),
                          Text('Kết quả HR', style: TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Quyết định
                      Row(
                        children: [
                          const Icon(Icons.flag, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            _attendance!.hrDecision ??
                                (_attendance!.status == AttendanceStatus.RESOLVED
                                    ? 'APPROVED'
                                    : _attendance!.status == AttendanceStatus.REJECTED
                                    ? 'REJECTED'
                                    : '—'),
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: _attendance!.status == AttendanceStatus.RESOLVED
                                  ? Colors.green
                                  : _attendance!.status == AttendanceStatus.REJECTED
                                  ? Colors.red
                                  : Colors.black87,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 8),

                      // HR note
                      if ((_attendance!.checkOutHrNote ?? '').isNotEmpty)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(top: 6),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(_attendance!.checkOutHrNote!),
                        )
                      else
                        const Text('HR chưa để lại ghi chú'),

                      const SizedBox(height: 12),

                      // Thời gian & Người xử lý
                      if (_attendance!.hrResolvedAt != null)
                        _kv('Thời gian xử lý',
                            DateFormat('HH:mm dd/MM/yyyy').format(_attendance!.hrResolvedAt!),
                            icon: Icons.schedule),
                      const SizedBox(height: 6),
                      _kv(
                        'Người xử lý',
                            () {
                          final hr = _attendance!.hrResolvedBy;
                          if (hr == null) return '—';
                          final full = '${hr.firstName ?? ''} ${hr.lastName ?? ''}'.trim();
                          return full.isNotEmpty ? full : (hr.username ?? '—');
                        }(),
                        icon: Icons.person_outline,
                      ),
                    ],
                  ),
                ),
              ),

            // Nút HR duyệt / từ chối
            if (role == 'HR' && _attendance!.status == AttendanceStatus.MISSING_CHECKOUT)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _hrResolve(false),
                        icon: const Icon(Icons.close),
                        label: const Text('Từ chối'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _hrResolve(true),
                        icon: const Icon(Icons.check),
                        label: const Text('Duyệt'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
