import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:easy_localization/easy_localization.dart';

import 'package:mobile/models/project_task_model.dart';
import 'package:mobile/models/enums/task_size.dart';
import 'package:mobile/services/task_service.dart';
import 'package:mobile/services/api_service.dart';

import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';

import 'package:mobile/screens/projects/task_detail_page.dart';

class KanbanBoardPage extends StatefulWidget {
  final int projectId;
  final String projectName;

  /// Nếu có phaseName thì AppBar sẽ hiển thị tên Phase (ưu tiên).
  final String? phaseName;

  /// FE filter theo phase (fallback).
  final int? phaseId;

  /// Danh sách taskId thuộc phase đã click (ưu tiên lọc theo IDs)
  final List<int>? phaseTaskIds;

  /// ✅ Phase đã COMPLETED?
  final bool phaseCompleted;

  /// ✅ PM id của CHÍNH dự án này (để phân quyền mở task khi phase completed)
  final int? projectPmId;

  const KanbanBoardPage({
    super.key,
    required this.projectId,
    required this.projectName,
    this.phaseName,
    this.phaseId,
    this.phaseTaskIds,
    this.phaseCompleted = false,
    this.projectPmId,
  });

  @override
  State<KanbanBoardPage> createState() => _KanbanBoardPageState();
}

class _KanbanBoardPageState extends State<KanbanBoardPage> {
  /// BE statuses: PLANNING, IN_PROGRESS, IN_REVIEW, COMPLETED, CANCELED
  final List<String> statuses = const [
    'PLANNING',
    'IN_PROGRESS',
    'IN_REVIEW',
    'COMPLETED',
    'CANCELED',
  ];

  late PageController _pageController;
  late Map<String, List<ProjectTaskModel>> columns;

  String searchKeyword = '';
  int currentPage = 0;
  Timer? _edgeDragTimer;

  bool loading = true;
  bool saving = false;

  String role = '';
  String? username;
  int? userId; // để so khớp PM dự án
  bool _dirty = false;

  ProjectTaskModel? _draggingTask;
  String? _hoveringStatus;

  bool get _phaseLocked => widget.phaseCompleted == true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    try {
      final acc = context.read<AuthProvider>().account;
      role = acc?.role ?? '';
      username = acc?.username;
      userId = acc?.id;
    } catch (_) {
      role = '';
      username = null;
      userId = null;
    }

    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final all = await TaskService.getKanbanTasks(widget.projectId);

      // ƯU TIÊN: lọc theo danh sách taskId nhận từ ProjectDetailPage
      List<ProjectTaskModel> tasks = all;
      if (widget.phaseTaskIds != null && widget.phaseTaskIds!.isNotEmpty) {
        final allow = widget.phaseTaskIds!.toSet();
        tasks = tasks.where((t) => allow.contains(t.id)).toList();
      } else if (widget.phaseId != null) {
        // Fallback: dùng phaseId nếu không có phaseTaskIds
        tasks = tasks.where((t) => t.phaseId == widget.phaseId).toList();
      }

      // EMP/HOD: chỉ giữ task assign cho chính họ
      if (_isViewerOnlyRole() && (username != null && username!.isNotEmpty)) {
        tasks = tasks.where((t) => t.assigneeUsername == username).toList();
      }

      // build columns
      columns = {for (final s in statuses) s: <ProjectTaskModel>[]};
      for (final t in tasks) {
        final st = (t.status).trim().toUpperCase();
        if (columns.containsKey(st)) {
          columns[st]!.add(t);
        }
      }

      debugPrint('[KANBAN] project=${widget.projectId}, phaseId=${widget.phaseId}, '
          'phaseTaskIds=${widget.phaseTaskIds?.length ?? 0}, afterFilter=${tasks.length}, '
          'phaseCompleted=${widget.phaseCompleted}');
    } catch (e) {
      columns = {for (final s in statuses) s: <ProjectTaskModel>[]};
      debugPrint('[KANBAN][ERR] load error: $e');
    }
    if (mounted) setState(() => loading = false);
  }

  bool _isViewerOnlyRole() {
    final r = role.toUpperCase();
    return r.startsWith('EMP') || r == 'EMPLOYEE' || r == 'HOD';
  }

  bool _isAdmin() => role.toUpperCase() == 'ADMIN';
  bool _isManager() => role.toUpperCase() == 'MANAGER';
  bool _isPM() => role.toUpperCase() == 'PM';
  bool _isProjectPM() =>
      _isPM() && userId != null && widget.projectPmId != null && userId == widget.projectPmId;

  bool _canCompleteFromReview() => !_phaseLocked && (_isAdmin() || _isManager() || _isProjectPM());
  bool _canCancel() => !_phaseLocked && (_isAdmin() || _isManager() || _isProjectPM());

  bool _canOpenTask(ProjectTaskModel task) {
    final s = task.status.toUpperCase();
    if (s == 'CANCELED') return false;

    if (_phaseLocked) {
      return _isAdmin() || _isManager() || _isProjectPM();
    }

    if (_isViewerOnlyRole()) {
      return s != 'COMPLETED';
    }
    return true;
  }

  bool _canStartDrag(ProjectTaskModel task) {
    if (_phaseLocked) return false;

    final s = task.status.toUpperCase();
    if (_isViewerOnlyRole() && (s == 'COMPLETED' || s == 'CANCELED')) {
      return false;
    }
    return true;
  }

  bool _isTransitionAllowed(String from, String to) {
    if (_phaseLocked) return false;

    from = from.toUpperCase();
    to = to.toUpperCase();

    final allowed = <String, Set<String>>{
      'PLANNING': {'PLANNING', 'IN_PROGRESS', 'CANCELED', 'IN_REVIEW'},
      'IN_PROGRESS': {'IN_PROGRESS', 'IN_REVIEW', 'CANCELED'},
      'IN_REVIEW': {'IN_REVIEW', 'COMPLETED', 'CANCELED', 'IN_PROGRESS'},
      'COMPLETED': {'COMPLETED', 'IN_PROGRESS'},
      'CANCELED': {'CANCELED', 'PLANNING', 'IN_PROGRESS'},
    };

    final can = allowed[from]?.contains(to) ?? false;
    if (!can) return false;

    if (from == 'IN_REVIEW' && to == 'COMPLETED' && !_canCompleteFromReview()) {
      return false;
    }
    if (to == 'CANCELED' && !_canCancel()) {
      return false;
    }
    if (_isViewerOnlyRole() && (from == 'CANCELED' || from == 'COMPLETED') && to != from) {
      return false;
    }

    return true;
  }

  Future<bool> _ensureInReviewPrereqs(ProjectTaskModel task) async {
    final evidences = await TaskService.listEvidence(task.id);
    if (evidences.isNotEmpty) return true;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _InReviewSheet(
        task: task,
        lockEvidence: _phaseLocked,
      ),
    );

    await _load();
    if (ok == true) _dirty = true;
    return ok == true;
  }

  Future<bool> _confirmCancel(ProjectTaskModel task) async {
    final res = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: Text('kanban.dialog.cancel_task.title'.tr()),
        content: Text(
          'kanban.dialog.cancel_task.message'.tr(namedArgs: {'name': task.name}),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'.tr()),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Confirm'.tr()),
          ),
        ],
      ),
    );
    return res == true;
  }

  Future<void> _commit(ProjectTaskModel task, String toStatus) async {
    setState(() => saving = true);
    try {
      await TaskService.updateStatus(task.id, toStatus);
      _dirty = true;
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  void _move({
    required String fromStatus,
    required String toStatus,
    required ProjectTaskModel task,
    required int newIndex,
  }) async {
    fromStatus = fromStatus.toUpperCase();
    toStatus = toStatus.toUpperCase();

    if (!_isTransitionAllowed(fromStatus, toStatus)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.snackbar.invalid_transition'.tr())),
      );
      return;
    }

    if (toStatus == 'IN_REVIEW') {
      final ok = await _ensureInReviewPrereqs(task);
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('kanban.snackbar.need_evidence_for_in_review'.tr())),
        );
        return;
      }
    }

    if (toStatus == 'CANCELED') {
      final ok = await _confirmCancel(task);
      if (!ok) return;
    }

    setState(() {
      columns[fromStatus]?.removeWhere((t) => t.id == task.id);
      final list = columns[toStatus]!;
      final safe = newIndex.clamp(0, list.length);
      list.insert(safe, task.copyWith(status: toStatus));
    });

    try {
      await _commit(task, toStatus);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'kanban.snackbar.moved_to'.tr(
              namedArgs: {
                'name': task.name,
                'status': _statusLabel(toStatus),
              },
            ),
          ),
        ),
      );
    } catch (_) {
      setState(() {
        columns[toStatus]?.removeWhere((t) => t.id == task.id);
        columns[fromStatus]?.add(task);
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.snackbar.update_status_failed'.tr())),
      );
    }
  }

  void _startEdgeDragTimer({required bool isLeft}) {
    _edgeDragTimer?.cancel();
    _edgeDragTimer = Timer(const Duration(milliseconds: 200), () {
      if (isLeft && currentPage > 0) {
        _pageController.previousPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      } else if (!isLeft && currentPage < statuses.length - 1) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _cancelEdgeDragTimer() => _edgeDragTimer?.cancel();

  @override
  void dispose() {
    _pageController.dispose();
    _edgeDragTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final String title =
        (widget.phaseName ?? '').trim().isEmpty ? 'kanban.title'.tr() : (widget.phaseName ?? '').trim();

    return WillPopScope(
      onWillPop: () async {
        Navigator.pop(context, _dirty);
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          actions: [
            IconButton(
              tooltip: 'kanban.refresh_tooltip'.tr(),
              onPressed: _load,
              icon: const Icon(Icons.refresh),
            ),
            if (saving)
              const Padding(
                padding: EdgeInsets.only(right: 12),
                child: Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
          ],
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'kanban.search.placeholder'.tr(),
                        border: const OutlineInputBorder(),
                      ),
                      onChanged: (v) => setState(() => searchKeyword = v.toLowerCase()),
                    ),
                  ),
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (i) => setState(() => currentPage = i),
                      itemCount: statuses.length,
                      itemBuilder: (context, index) {
                        final status = statuses[index];
                        final all = columns[status] ?? [];
                        final tasks = all.where((t) => t.name.toLowerCase().contains(searchKeyword)).toList();

                        return Stack(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _statusLabel(status),
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 12),

                                  // Cột Kanban
                                  Expanded(
                                    child: DragTarget<ProjectTaskModel>(
                                      onWillAccept: (incoming) {
                                        if (incoming == null || _phaseLocked) return false;
                                        final ok = _isTransitionAllowed(incoming.status, status);
                                        setState(() => _hoveringStatus = status);
                                        return ok;
                                      },
                                      onLeave: (_) {
                                        if (_hoveringStatus == status) {
                                          setState(() => _hoveringStatus = null);
                                        }
                                      },
                                      onAcceptWithDetails: (details) {
                                        if (_phaseLocked) return;
                                        final dragged = details.data;
                                        final from = dragged.status.toUpperCase();
                                        setState(() => _hoveringStatus = null);
                                        _move(
                                          fromStatus: from,
                                          toStatus: status,
                                          task: dragged,
                                          newIndex: tasks.length,
                                        );
                                      },
                                      builder: (context, candidateData, rejectedData) {
                                        final isDragging = _draggingTask != null;
                                        final isHoveringHere = _hoveringStatus == status;

                                        final willAllow = (!_phaseLocked && isDragging)
                                            ? _isTransitionAllowed(_draggingTask!.status, status)
                                            : false;

                                        final hoveringAllowed = !_phaseLocked && candidateData.isNotEmpty;
                                        final ColorScheme scheme = Theme.of(context).colorScheme;
                                        final Color okColor = scheme.primary;
                                        final Color denyColor = scheme.error;

                                        final Color? bgColor = isHoveringHere
                                            ? (hoveringAllowed
                                                ? okColor.withOpacity(0.08)
                                                : denyColor.withOpacity(0.06))
                                            : (isDragging
                                                ? (willAllow
                                                    ? okColor.withOpacity(0.04)
                                                    : denyColor.withOpacity(0.03))
                                                : null);

                                        final Color borderColor = isHoveringHere
                                            ? (hoveringAllowed ? okColor : denyColor)
                                            : Colors.transparent;

                                        return AnimatedContainer(
                                          duration: const Duration(milliseconds: 120),
                                          curve: Curves.easeInOut,
                                          padding: EdgeInsets.zero,
                                          decoration: BoxDecoration(
                                            color: bgColor,
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(
                                              color: borderColor,
                                              width: isHoveringHere ? 2 : 1,
                                            ),
                                          ),
                                          child: ListView.builder(
                                            itemCount: (columns[status] ?? const [])
                                                .where((t) => t.name.toLowerCase().contains(searchKeyword))
                                                .length,
                                            itemBuilder: (context, taskIndex) {
                                              final allIn = columns[status] ?? [];
                                              final filtered = allIn
                                                  .where((t) => t.name.toLowerCase().contains(searchKeyword))
                                                  .toList();
                                              final task = filtered[taskIndex];

                                              final canOpenDetail = _canOpenTask(task);
                                              final canDrag = _canStartDrag(task);

                                              final card = TaskCard(
                                                task: task,
                                                onOpenDetail: canOpenDetail
                                                    ? () async {
                                                        final changed = await Navigator.of(context).push(
                                                          MaterialPageRoute(
                                                            builder: (_) => TaskDetailPage(
                                                              task: task,
                                                              lockEvidence: _phaseLocked,
                                                            ),
                                                          ),
                                                        );
                                                        if (changed == true) {
                                                          _dirty = true;
                                                          _load();
                                                        }
                                                      }
                                                    : null,
                                              );

                                              final droppableCard = DragTarget<ProjectTaskModel>(
                                                onWillAccept: (incoming) =>
                                                    !_phaseLocked &&
                                                    incoming != null &&
                                                    incoming.id != task.id &&
                                                    _isTransitionAllowed(incoming.status, status),
                                                onAccept: (incoming) {
                                                  if (_phaseLocked) return;
                                                  final from = incoming.status.toUpperCase();
                                                  _move(
                                                    fromStatus: from,
                                                    toStatus: status,
                                                    task: incoming,
                                                    newIndex: taskIndex,
                                                  );
                                                },
                                                builder: (context, _, __) => card,
                                              );

                                              if (!canDrag) return droppableCard;

                                              return LongPressDraggable<ProjectTaskModel>(
                                                data: task,
                                                dragAnchorStrategy: pointerDragAnchorStrategy,
                                                onDragStarted: () => setState(() {
                                                  _draggingTask = task;
                                                }),
                                                onDragEnd: (_) => setState(() {
                                                  _draggingTask = null;
                                                  _hoveringStatus = null;
                                                }),
                                                feedback: Material(
                                                  elevation: 6,
                                                  child: SizedBox(
                                                    width: MediaQuery.of(context).size.width * 0.8,
                                                    child: TaskCard(
                                                      task: task,
                                                      onOpenDetail: null, // preview
                                                    ),
                                                  ),
                                                ),
                                                childWhenDragging: const SizedBox.shrink(),
                                                child: droppableCard,
                                              );
                                            },
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            if (index > 0)
                              Positioned(
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 50,
                                child: DragTarget<ProjectTaskModel>(
                                  onWillAccept: (_) {
                                    if (_phaseLocked) return false;
                                    _startEdgeDragTimer(isLeft: true);
                                    return true;
                                  },
                                  onLeave: (_) => _cancelEdgeDragTimer(),
                                  onAccept: (_) => _cancelEdgeDragTimer(),
                                  builder: (_, __, ___) => const SizedBox.expand(),
                                ),
                              ),
                            if (index < statuses.length - 1)
                              Positioned(
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 50,
                                child: DragTarget<ProjectTaskModel>(
                                  onWillAccept: (_) {
                                    if (_phaseLocked) return false;
                                    _startEdgeDragTimer(isLeft: false);
                                    return true;
                                  },
                                  onLeave: (_) => _cancelEdgeDragTimer(),
                                  onAccept: (_) => _cancelEdgeDragTimer(),
                                  builder: (_, __, ___) => const SizedBox.expand(),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  String _statusLabel(String stt) {
    switch (stt.toUpperCase()) {
      case 'PLANNING':
        return 'kanban.status.PLANNING'.tr();
      case 'IN_PROGRESS':
        return 'kanban.status.IN_PROGRESS'.tr();
      case 'IN_REVIEW':
        return 'kanban.status.IN_REVIEW'.tr();
      case 'COMPLETED':
        return 'kanban.status.COMPLETED'.tr();
      case 'CANCELED':
        return 'kanban.status.CANCELED'.tr();
      default:
        return stt;
    }
  }
}

class TaskCard extends StatelessWidget {
  final ProjectTaskModel task;
  final VoidCallback? onOpenDetail;
  const TaskCard({super.key, required this.task, this.onOpenDetail});

  @override
  Widget build(BuildContext context) {
    final canOpen = onOpenDetail != null;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (canOpen)
              InkWell(
                onTap: onOpenDetail,
                child: Text(
                  task.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.underline,
                  ),
                ),
              )
            else
              Text(
                task.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                Text('${'kanban.card.status'.tr()}: ${task.status}'),
                if (task.size != null) Text('${'kanban.card.size'.tr()}: ${task.size!.displayName}'),
                if (task.assigneeName != null)
                  Text('${'kanban.card.assignee'.tr()}: ${task.assigneeName!}',
                      style: const TextStyle(fontStyle: FontStyle.italic)),
                if (task.deadline != null)
                  Text('${'kanban.card.deadline'.tr()}: ${DateFormat('dd/MM/yyyy').format(task.deadline!)}'),
                if (task.githubBranch != null && task.githubBranch!.isNotEmpty)
                  Text('${'kanban.card.branch'.tr()}: ${task.githubBranch}'),
                if (task.pullRequestUrl != null && task.pullRequestUrl!.isNotEmpty)
                  Text('${'kanban.card.pr'.tr()}: ${task.pullRequestUrl}'),
                if (task.merged == true) Text('✅ ${'kanban.card.merged'.tr()}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// BottomSheet: upload + hiển thị + xoá bằng chứng ngay tại chỗ
class _InReviewSheet extends StatefulWidget {
  final ProjectTaskModel task;

  /// ✅ Khi true: ẩn upload & ẩn mọi hành vi xóa (nút xóa từng ảnh + Xóa tất cả)
  final bool lockEvidence;

  const _InReviewSheet({
    required this.task,
    this.lockEvidence = false,
  });

  @override
  State<_InReviewSheet> createState() => _InReviewSheetState();
}

class _InReviewSheetState extends State<_InReviewSheet> {
  bool uploading = false;
  final ImagePicker _picker = ImagePicker();

  List<dynamic> _evidences = []; // [{id, fileName, url, ...}]

  @override
  void initState() {
    super.initState();
    _refreshEvidences();
  }

  Future<void> _refreshEvidences() async {
    final list = await TaskService.listEvidence(widget.task.id);
    if (!mounted) return;
    setState(() => _evidences = list);
  }

  Future<void> _pickAndUpload() async {
    if (widget.lockEvidence) return;

    final choice = await showModalBottomSheet<String>(
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
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (choice == null) return;

    try {
      setState(() => uploading = true);

      final List<MultipartFile> files = [];

      if (choice == 'camera') {
        final XFile? photo = await _picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 90,
          maxWidth: 2560,
          maxHeight: 2560,
        );
        if (photo != null) {
          files.add(await _xFileToMultipart(photo));
        }
      } else if (choice == 'gallery') {
        final List<XFile> photos = await _picker.pickMultiImage(imageQuality: 90);
        for (final x in photos) {
          files.add(await _xFileToMultipart(x));
        }
      }

      if (files.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('kanban.sheet.no_selection'.tr())),
        );
        return;
      }

      await TaskService.uploadEvidence(widget.task.id, files);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.sheet.uploaded'.tr())),
      );

      await _refreshEvidences(); // cập nhật grid
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.sheet.upload_failed_with_error'.tr(namedArgs: {'error': '$e'}))),
      );
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Future<void> _deleteEvidence(int evidenceId) async {
    if (widget.lockEvidence) return;
    await TaskService.deleteEvidence(evidenceId);
    await _refreshEvidences();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('kanban.sheet.deleted'.tr())),
    );
  }

  Future<void> _clearAll() async {
    if (widget.lockEvidence) return;
    await TaskService.clearAllEvidence(widget.task.id);
    await _refreshEvidences();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('kanban.sheet.cleared'.tr())),
    );
  }

  Future<MultipartFile> _xFileToMultipart(XFile x) async {
    final path = x.path;
    final name = p.basename(path);
    return MultipartFile.fromFile(path, filename: name);
  }

  Future<void> _done() async {
    final evidences = await TaskService.listEvidence(widget.task.id);
    if (evidences.isNotEmpty) {
      if (!mounted) return;
      Navigator.pop(context, true);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('kanban.sheet.need_evidence_before_confirm'.tr())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final inReviewLabel = 'kanban.status.IN_REVIEW'.tr();

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'kanban.sheet.move_to_in_review'
                          .tr(namedArgs: {'name': widget.task.name, 'status': inReviewLabel}),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (_evidences.isNotEmpty && !widget.lockEvidence)
                    IconButton(
                      tooltip: 'kanban.sheet.delete_all_tooltip'.tr(),
                      onPressed: uploading ? null : _clearAll,
                      icon: const Icon(Icons.delete_sweep_outlined),
                    )
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (!widget.lockEvidence)
                    ElevatedButton.icon(
                      onPressed: uploading ? null : _pickAndUpload,
                      icon: const Icon(Icons.upload_file),
                      label: Text(uploading ? 'kanban.sheet.uploading'.tr() : 'kanban.sheet.upload_btn'.tr()),
                    ),
                  const Spacer(),
                  FilledButton(
                    onPressed: uploading ? null : _done,
                    child: Text('kanban.sheet.confirm'.tr()),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_evidences.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text('kanban.sheet.empty'.tr()),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _evidences.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1,
                  ),
                  itemBuilder: (context, i) {
                    final ev = _evidences[i] as Map<String, dynamic>;
                    final raw = ev['url'] as String? ?? '';
                    final id = ev['id'] as int?;
                    final url = ApiService.absoluteUrl(raw);

                    return _EvidenceThumb(
                      imageUrl: url,
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (_) => Dialog(
                            child: InteractiveViewer(
                              child: _NetImage(url, fit: BoxFit.contain, cacheBust: true),
                            ),
                          ),
                        );
                      },
                      onDelete: (!widget.lockEvidence && id != null)
                          ? () => _deleteEvidence(id)
                          : null,
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EvidenceThumb extends StatelessWidget {
  final String imageUrl;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  const _EvidenceThumb({
    required this.imageUrl,
    this.onTap,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: InkWell(
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: _NetImage(imageUrl, fit: BoxFit.cover),
            ),
          ),
        ),
        if (onDelete != null)
          Positioned(
            top: 4,
            right: 4,
            child: Material(
              color: Colors.black54,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onDelete,
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(Icons.close, size: 16, color: Colors.white),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Ảnh mạng kèm Authorization header (nếu có) + tuỳ chọn cache-bust
class _NetImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  final bool cacheBust;

  const _NetImage(this.url, {required this.fit, this.cacheBust = false});

  String _maybeBust(String u) {
    if (!cacheBust) return u;
    final sep = u.contains('?') ? '&' : '?';
    return '$u${sep}v=${DateTime.now().millisecondsSinceEpoch}';
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, String>?>(
      future: ApiService.authHeaders(),
      builder: (_, snap) {
        final u = _maybeBust(url);
        final key = ValueKey('img-${snap.hasData ? 'auth' : 'noauth'}-$u');
        return Image.network(
          u,
          key: key,
          headers: snap.data,
          fit: fit,
          errorBuilder: (_, __, ___) => Container(
            color: Colors.grey.shade200,
            alignment: Alignment.center,
            child: const Icon(Icons.broken_image),
          ),
        );
      },
    );
  }
}
