import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';

import 'package:mobile/models/enums/task_size.dart';
import 'package:mobile/models/project_task_model.dart';
import 'package:mobile/services/task_service.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/providers/auth_provider.dart';

class TaskDetailPage extends StatefulWidget {
  final ProjectTaskModel task;

  /// Khi true (phase COMPLETED) => khóa upload & xóa evidence.
  final bool lockEvidence;

  const TaskDetailPage({
    super.key,
    required this.task,
    this.lockEvidence = false,
  });

  @override
  State<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends State<TaskDetailPage> {
  bool loading = false;
  bool uploading = false;
  bool _dirty = false; // có thay đổi để báo màn trước refresh
  List<dynamic> evidences = [];

  final picker = ImagePicker();

  String _role = '';
  String? _username;

  bool get _evidenceLocked => widget.lockEvidence;

  /// Quyền cơ bản (không tính trạng thái phase)
  bool get _baseCanModifyEvidence {
    final r = _role.toUpperCase();
    final isAdminish = r == 'ADMIN' || r == 'MANAGER' || r == 'PM';
    final isAssignee = (widget.task.assigneeUsername != null &&
        widget.task.assigneeUsername == _username);
    return isAdminish || isAssignee;
  }

  /// Chỉ cho phép khi có quyền CƠ BẢN và phase chưa bị khóa
  bool get _canAddOrDeleteEvidence => _baseCanModifyEvidence && !_evidenceLocked;

  @override
  void initState() {
    super.initState();
    try {
      final acc = context.read<AuthProvider>().account;
      _role = acc?.role ?? '';
      _username = acc?.username;
    } catch (_) {
      _role = '';
      _username = null;
    }
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final list = await TaskService.listEvidence(widget.task.id);
      if (!mounted) return;
      setState(() => evidences = list);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _showLockedSnack() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('task_detail.locked_snack'.tr())),
    );
  }

  Future<void> _uploadFromCamera() async {
    if (_evidenceLocked) return _showLockedSnack();
    final XFile? x = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 90,
      maxWidth: 2560,
      maxHeight: 2560,
    );
    if (x == null) return;
    await _uploadFiles([await MultipartFile.fromFile(x.path, filename: p.basename(x.path))]);
  }

  Future<void> _uploadFromGallery() async {
    if (_evidenceLocked) return _showLockedSnack();
    final xs = await picker.pickMultiImage(imageQuality: 90);
    if (xs.isEmpty) return;
    final files = <MultipartFile>[];
    for (final x in xs) {
      files.add(await MultipartFile.fromFile(x.path, filename: p.basename(x.path)));
    }
    await _uploadFiles(files);
  }

  Future<void> _uploadFiles(List<MultipartFile> files) async {
    if (_evidenceLocked) return _showLockedSnack();
    setState(() => uploading = true);
    try {
      await TaskService.uploadEvidence(widget.task.id, files);
      _dirty = true; // có upload
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.sheet.uploaded'.tr())),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'kanban.sheet.upload_failed_with_error'.tr(
              namedArgs: {'error': e.toString()},
            ),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Future<void> _deleteOne(int id) async {
    if (_evidenceLocked) return _showLockedSnack();
    await TaskService.deleteEvidence(id);
    _dirty = true;
    await _load();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('kanban.sheet.deleted'.tr())),
    );
  }

  Future<void> _clearAll() async {
    if (_evidenceLocked) return _showLockedSnack();
    await TaskService.clearAllEvidence(widget.task.id);
    _dirty = true;
    await _load();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('kanban.sheet.cleared'.tr())),
    );
  }

  Future<void> _chooseSourceAndUpload() async {
    if (_evidenceLocked) return _showLockedSnack();
    final v = await showModalBottomSheet<String>(
      context: context,
      builder: (_) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: Text('kanban.sheet.camera'.tr()),
              onTap: () => Navigator.pop(context, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: Text('kanban.sheet.gallery'.tr()),
              onTap: () => Navigator.pop(context, 'gallery'),
            ),
          ],
        ),
      ),
    );
    if (v == 'camera') return _uploadFromCamera();
    if (v == 'gallery') return _uploadFromGallery();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    return WillPopScope(
      onWillPop: () async {
        Navigator.pop(context, _dirty); // trả cờ về màn trước
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          leading: BackButton(onPressed: () => Navigator.pop(context, _dirty)),
          title: Text('task_detail.title'.tr()),
          actions: [
            IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
          ],
        ),

        // Ẩn FAB thêm bằng chứng khi phase COMPLETED hoặc không có quyền
        floatingActionButton: _canAddOrDeleteEvidence
            ? PopupMenuButton<String>(
                tooltip: 'kanban.sheet.upload_btn'.tr(),
                onSelected: (v) {
                  if (v == 'camera') _uploadFromCamera();
                  if (v == 'gallery') _uploadFromGallery();
                },
                itemBuilder: (ctx) => [
                  PopupMenuItem(
                    value: 'camera',
                    child: ListTile(
                      leading: const Icon(Icons.photo_camera),
                      title: Text('kanban.sheet.camera'.tr()),
                    ),
                  ),
                  PopupMenuItem(
                    value: 'gallery',
                    child: ListTile(
                      leading: const Icon(Icons.photo_library),
                      title: Text('kanban.sheet.gallery'.tr()),
                    ),
                  ),
                ],
                child: FloatingActionButton(
                  onPressed: () {},
                  child: uploading
                      ? const CircularProgressIndicator(strokeWidth: 2)
                      : const Icon(Icons.add_a_photo),
                ),
              )
            : null,

        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Thông tin task
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 12,
                            runSpacing: 6,
                            children: [
                              _kv('kanban.card.status'.tr(), t.status),
                              if (t.size != null) _kv('kanban.card.size'.tr(), t.size!.displayName),
                              if (t.assigneeName != null) _kv('kanban.card.assignee'.tr(), t.assigneeName!),
                              if (t.deadline != null) _kv('kanban.card.deadline'.tr(), DateFormat('dd/MM/yyyy').format(t.deadline!)),
                              if (t.githubBranch != null && t.githubBranch!.isNotEmpty) _kv('kanban.card.branch'.tr(), t.githubBranch!),
                              if (t.pullRequestUrl != null && t.pullRequestUrl!.isNotEmpty) _kv('kanban.card.pr'.tr(), t.pullRequestUrl!),
                              if (t.merged == true) Chip(label: Text('✅ ${'kanban.card.merged'.tr()}')),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Tiêu đề + nút clear
                  Row(
                    children: [
                      Text(
                        'task_detail.evidence'.tr(),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      if (evidences.isNotEmpty && _canAddOrDeleteEvidence)
                        TextButton.icon(
                          onPressed: _clearAll,
                          icon: const Icon(Icons.delete_sweep_outlined),
                          label: Text('kanban.sheet.delete_all_tooltip'.tr()),
                        ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Grid evidence + ô thêm mới (ô + ở vị trí đầu tiên — chỉ hiện khi có quyền & chưa lock)
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: evidences.length + (_canAddOrDeleteEvidence ? 1 : 0),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                      childAspectRatio: 1,
                    ),
                    itemBuilder: (context, i) {
                      if (_canAddOrDeleteEvidence && i == 0) {
                        // Ô thêm mới
                        return InkWell(
                          onTap: _chooseSourceAndUpload,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade400),
                            ),
                            child: const Center(child: Icon(Icons.add_a_photo, size: 28)),
                          ),
                        );
                      }

                      final ev = evidences[i - (_canAddOrDeleteEvidence ? 1 : 0)] as Map<String, dynamic>;
                      final raw = ev['url'] as String? ?? '';
                      final id = ev['id'] as int?;
                      final url = ApiService.absoluteUrl(raw);

                      return Stack(
                        children: [
                          Positioned.fill(
                            child: InkWell(
                              onTap: () => showDialog(
                                context: context,
                                builder: (_) => Dialog(
                                  child: InteractiveViewer(
                                    child: Image.network(url, fit: BoxFit.contain),
                                  ),
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: Colors.grey.shade200,
                                    alignment: Alignment.center,
                                    child: const Icon(Icons.insert_drive_file_outlined),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          if (_canAddOrDeleteEvidence && id != null)
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Material(
                                color: Colors.black54,
                                shape: const CircleBorder(),
                                child: InkWell(
                                  customBorder: const CircleBorder(),
                                  onTap: () => _deleteOne(id),
                                  child: const Padding(
                                    padding: EdgeInsets.all(4),
                                    child: Icon(Icons.close, size: 16, color: Colors.white),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ],
              ),
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$k: ', style: const TextStyle(fontWeight: FontWeight.w600)),
        Flexible(child: Text(v)),
      ],
    );
  }
}
