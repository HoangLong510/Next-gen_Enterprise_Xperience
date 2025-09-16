import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';

import 'package:mobile/models/project_model.dart';
import 'package:mobile/models/enums/project_status.dart';
import 'package:mobile/services/project_service.dart';
import 'package:mobile/providers/auth_provider.dart';

class ProjectListPage extends StatefulWidget {
  const ProjectListPage({super.key});

  @override
  State<ProjectListPage> createState() => _ProjectListPageState();
}

class _ProjectListPageState extends State<ProjectListPage> {
  List<ProjectModel> _projects = [];
  List<ProjectModel> _projectsBase = []; // nguồn gốc để lọc cục bộ cho EMP/HOD
  bool _isLoading = false;

  String? statusFilter; // dùng ProjectStatus.name
  String? searchTerm;

  final TextEditingController _searchCtrl = TextEditingController();
  String _role = '';

  bool get _isEmpOrHod =>
      _role.toUpperCase() == 'EMPLOYEE' || _role.toUpperCase() == 'HOD';

  @override
  void initState() {
    super.initState();
    try {
      _role = context.read<AuthProvider>().account?.role ?? '';
    } catch (_) {
      _role = '';
    }
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _isLoading = true);
    try {
      if (_isEmpOrHod) {
        // EMP/HOD: luôn lấy danh sách từ /projects/kanban rồi lọc cục bộ
        _projectsBase = await ProjectService.getKanbanVisible();
        _applyLocalFilters();
      } else {
        // ADMIN/MANAGER/PM:
        // - có searchTerm -> gọi /projects/search
        // - có statusFilter -> gọi /projects/filter
        // - mặc định -> /projects
        if (searchTerm != null && searchTerm!.isNotEmpty) {
          _projects = await ProjectService.search(searchTerm!.trim());
        } else if (statusFilter != null && statusFilter!.isNotEmpty) {
          _projects = await ProjectService.filter(status: statusFilter);
        } else {
          _projects = await ProjectService.getAllVisible();
        }
      }
    } catch (e) {
      debugPrint('Lỗi fetch projects: $e');
      _projects = [];
      _projectsBase = [];
    }
    if (mounted) setState(() => _isLoading = false);
  }

  void _applyLocalFilters() {
    // áp dụng search/status trên _projectsBase cho EMP/HOD
    Iterable<ProjectModel> data = _projectsBase;

    if (statusFilter != null && statusFilter!.isNotEmpty) {
      final st = ProjectStatusX.fromString(statusFilter!);
      data = data.where((p) => p.status == st);
    }
    if (searchTerm != null && searchTerm!.isNotEmpty) {
      final kw = searchTerm!.toLowerCase();
      data = data.where((p) => p.name.toLowerCase().contains(kw));
    }

    _projects = data.toList();
  }

  Color _statusColor(ProjectStatus stt) {
    switch (stt) {
      case ProjectStatus.COMPLETED:
        return Colors.green;
      case ProjectStatus.IN_PROGRESS:
        return Colors.orange;
      case ProjectStatus.PLANNING:
        return Colors.blueGrey;
      case ProjectStatus.CANCELED:
        return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('project_list.title'.tr())),
      body: Column(
        children: [
          _filterBar(),
          const Divider(height: 1),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _fetch,
                    child: _projects.isEmpty
                        ? ListView(
                            children: [
                              const SizedBox(height: 160),
                              Center(child: Text('project_list.empty'.tr())),
                            ],
                          )
                        : ListView.builder(
                            itemCount: _projects.length,
                            itemBuilder: (_, i) => _ProjectCard(
                              project: _projects[i],
                              statusColor: _statusColor(_projects[i].status),
                              onTap: () async {
                                // ⬇️ Chờ màn chi tiết trả cờ "dirty" để biết có cần reload list không
                                final dirty = await Navigator.pushNamed(
                                  context,
                                  '/projects/detail',
                                  arguments: _projects[i], // truyền nguyên model
                                );
                                if (dirty == true && mounted) {
                                  // có thay đổi ở màn trong -> reload danh sách
                                  _fetch();
                                }
                              },
                            ),
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _filterBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Search
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                labelText: _isEmpOrHod
                    ? 'project_list.search.placeholder_local'.tr()
                    : 'project_list.search.placeholder_remote'.tr(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () {
                    searchTerm = _searchCtrl.text.trim();
                    if (_isEmpOrHod) {
                      _applyLocalFilters();
                      setState(() {});
                    } else {
                      _fetch();
                    }
                  },
                ),
              ),
              onSubmitted: (v) {
                searchTerm = v.trim();
                if (_isEmpOrHod) {
                  _applyLocalFilters();
                  setState(() {});
                } else {
                  _fetch();
                }
              },
            ),
          ),
          const SizedBox(width: 12),
          // Status filter
          DropdownButton<String?>(
            hint: Text('project_list.filter.status'.tr()),
            value: statusFilter,
            items: [null, ...ProjectStatus.values.map((e) => e.name)]
                .map((value) => DropdownMenuItem<String?>(
                      value: value,
                      child: Text(
                        value == null
                            ? 'common.all'.tr()
                            : ProjectStatusX.fromString(value).displayName,
                      ),
                    ))
                .toList(),
            onChanged: (val) {
              setState(() {
                statusFilter = val;
                if (val != null) {
                  _searchCtrl.clear();
                  searchTerm = null;
                }
              });
              if (_isEmpOrHod) {
                _applyLocalFilters();
                setState(() {});
              } else {
                _fetch();
              }
            },
          ),
        ],
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final ProjectModel project;
  final Color statusColor;
  final VoidCallback onTap;

  const _ProjectCard({
    required this.project,
    required this.statusColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      project.name,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (project.repoLink != null)
                    IconButton(
                      onPressed: () {
                        // TODO: mở repoLink bằng url_launcher nếu muốn
                      },
                      icon: const Icon(Icons.link),
                      tooltip: 'project_card.repo_tooltip'.tr(),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  if (project.documentCode != null)
                    Text('📄 ${'project_card.document_code'.tr()}: ${project.documentCode}'),
                  if (project.pmName != null)
                    Text('👤 ${'project_card.pm'.tr()}: ${project.pmName}'),
                  Text(
                    '📌 ${'project_card.status'.tr()}: ${project.status.displayName}',
                    style: TextStyle(
                        color: statusColor, fontWeight: FontWeight.w600),
                  ),
                  if (project.deadline != null)
                    Text(
                      '🗓️ ${'project_card.deadline'.tr()}: '
                      '${DateFormat('dd/MM/yyyy').format(project.deadline!)}',
                    ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: project.progressRatio,
                backgroundColor: Colors.grey.shade200,
                color: statusColor,
                minHeight: 8,
                borderRadius: const BorderRadius.all(Radius.circular(4)),
              ),
              const SizedBox(height: 6),
              Text(
                '${project.doneTask}/${project.totalTask} ${'common.tasks'.tr()} • ${project.progress}%',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
