import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';

import 'package:mobile/models/project_model.dart';
import 'package:mobile/models/phase_model.dart';
import 'package:mobile/models/enums/project_status.dart';
import 'package:mobile/services/phase_service.dart';
import 'package:mobile/screens/projects/kanban_board_page.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/models/enums/phase_status.dart';

class ProjectDetailPage extends StatefulWidget {
  final ProjectModel project;
  const ProjectDetailPage({super.key, required this.project});

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> {
  List<PhaseModel> phases = [];
  bool loading = true;
  int? expandedPhaseIndex;
  String searchTask = '';

  String _role = '';
  String? _username;

  bool _dirty = false; // có thay đổi từ màn con (Kanban/Task)?

  bool get _isEmpOrHod =>
      _role.toUpperCase() == 'EMPLOYEE' || _role.toUpperCase() == 'HOD';

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
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => loading = true);
    try {
      phases = await PhaseService.getPhasesWithTasksByProject(widget.project.id);
    } catch (e) {
      debugPrint('Fetch phases error: $e');
      phases = [];
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        Navigator.pop(context, _dirty);
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.project.name),
          actions: [
            IconButton(
              tooltip: 'project_detail.refresh_tooltip'.tr(),
              onPressed: _fetch,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _projectHeader(),
                    const SizedBox(height: 16),
                    TextField(
                      decoration: InputDecoration(
                        labelText: 'project_detail.search_tasks_placeholder'.tr(),
                        border: const OutlineInputBorder(),
                      ),
                      onChanged: (val) =>
                          setState(() => searchTask = val.toLowerCase()),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView.builder(
                        itemCount: phases.length,
                        itemBuilder: (_, index) {
                          final phase = phases[index];
                          final isExpanded = expandedPhaseIndex == index;

                          // Base filter: theo tên
                          var filteredTasks = phase.tasks
                              .where((t) =>
                                  (t.name).toLowerCase().contains(searchTask))
                              .toList();

                          // Extra filter cho EMP/HOD: chỉ task của chính mình
                          if (_isEmpOrHod && (_username?.isNotEmpty ?? false)) {
                            filteredTasks = filteredTasks
                                .where((t) => t.assigneeUsername == _username)
                                .toList();
                          }

                          return Card(
                            elevation: 2,
                            margin: const EdgeInsets.symmetric(vertical: 8),
                            child: Column(
                              children: [
                                ListTile(
                                  title: Text(
                                    'project_detail.phase_title'.tr(
                                      namedArgs: {
                                        'index':
                                            '${phase.sequence ?? index + 1}',
                                        'name': phase.name,
                                      },
                                    ),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${'project_detail.status_prefix'.tr()}${phase.status.displayName}',
                                  ),
                                  trailing: IconButton(
                                    icon: Icon(isExpanded
                                        ? Icons.keyboard_arrow_up
                                        : Icons.keyboard_arrow_down),
                                    onPressed: () => setState(
                                      () => expandedPhaseIndex =
                                          isExpanded ? null : index,
                                    ),
                                  ),
                                  onTap: () async {
                                    // ProjectDetailPage: onTap phase tile
                                    final changed = await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => KanbanBoardPage(
                                          projectId: widget.project.id,
                                          projectName: widget.project.name,
                                          phaseId: phase.id, // dự phòng
                                          phaseName: 'project_detail.phase_title'
                                              .tr(
                                            namedArgs: {
                                              'index':
                                                  '${phase.sequence ?? index + 1}',
                                              'name': phase.name,
                                            },
                                          ),
                                          phaseTaskIds: phase.tasks
                                              .map((t) => t.id)
                                              .toList(),
                                          // ⬇️ Quan trọng:
                                          phaseCompleted: phase.status ==
                                              PhaseStatus.COMPLETED,
                                          projectPmId: widget.project.pmId,
                                        ),
                                      ),
                                    );

                                    if (changed == true) {
                                      _dirty = true;
                                      _fetch();
                                    }
                                  },
                                ),
                                if (isExpanded)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 8,
                                    ),
                                    child: Column(
                                      children: filteredTasks.isEmpty
                                          ? [
                                              Text('project_detail.no_matching_tasks'
                                                  .tr())
                                            ]
                                          : filteredTasks
                                              .map(
                                                (task) => ListTile(
                                                  contentPadding:
                                                      EdgeInsets.zero,
                                                  leading: const Icon(
                                                    Icons.task_alt,
                                                  ),
                                                  title: Text(task.name),
                                                  subtitle: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        '${'project_detail.status_prefix'.tr()}${task.status}',
                                                      ),
                                                      if (task.assigneeName !=
                                                          null)
                                                        Text(
                                                          '${'project_detail.assignee'.tr()}: ${task.assigneeName}',
                                                          style:
                                                              const TextStyle(
                                                            fontStyle: FontStyle
                                                                .italic,
                                                          ),
                                                        ),
                                                      if (task.deadline !=
                                                          null)
                                                        Text(
                                                          '${'project_detail.header.deadline'.tr()}: ${DateFormat('dd/MM/yyyy').format(task.deadline!)}',
                                                        ),
                                                    ],
                                                  ),
                                                ),
                                              )
                                              .toList(),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _projectHeader() {
    return Card(
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.project.name,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            if (widget.project.documentCode != null)
              Text(
                '📄 ${'project_detail.header.document_code'.tr()}: ${widget.project.documentCode}',
              ),
            if (widget.project.pmName != null)
              Text('👤 ${'project_detail.header.pm'.tr()}: ${widget.project.pmName}'),
            Text(
              '📌 ${'project_detail.header.status'.tr()}: ${widget.project.status.displayName}',
            ),
            if (widget.project.deadline != null)
              Text(
                '🗓️ ${'project_detail.header.deadline'.tr()}: ${DateFormat('dd/MM/yyyy').format(widget.project.deadline!)}',
              ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: widget.project.progressRatio,
              backgroundColor: Colors.grey.shade200,
            ),
            const SizedBox(height: 4),
            Text(
              'project_detail.header.progress_summary'.tr(
                namedArgs: {
                  'progress': '${widget.project.progress}',
                  'done': '${widget.project.doneTask}',
                  'total': '${widget.project.totalTask}',
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
