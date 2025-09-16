import 'package:flutter/material.dart';
import 'package:mobile/screens/projects/project_detail_page.dart';
import 'package:mobile/models/project_model.dart';

class ProjectListPage extends StatefulWidget {
  const ProjectListPage({super.key});

  @override
  State<ProjectListPage> createState() => _ProjectListPageState();
}

class _ProjectListPageState extends State<ProjectListPage> {
  List<Project> allProjects = [];
  List<Project> filteredProjects = [];
  String searchTerm = '';
  String? selectedStatus;

  @override
  void initState() {
    super.initState();
    seedFakeProjects();
  }

  void seedFakeProjects() {
    allProjects = [
      Project(
        name: "Hệ thống ERP",
        code: "DOC001",
        pmName: "Nguyễn Văn A",
        status: "IN_PROGRESS",
        progress: 0.6,
        phases: [
          Phase(
            name: "Phân tích nghiệp vụ",
            status: "COMPLETED",
            tasks: [
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Phỏng vấn người dùng", status: "DONE", assignee: "Nguyễn Văn B"),
              Task(name: "Viết tài liệu BRD", status: "IN_PROGRESS", assignee: null),
            ],
          ),
          Phase(
            name: "Thiết kế hệ thống",
            status: "IN_PROGRESS",
            tasks: [
              Task(name: "Thiết kế UI", status: "NEW", assignee: "Lê Thị A"),
              Task(name: "Thiết kế Database", status: "NEW", assignee: null),
            ],
          ),
        ],
      ),
      Project(
        name: "App Quản lý nhân sự",
        code: "DOC002",
        pmName: "Trần Thị B",
        status: "COMPLETED",
        progress: 1.0,
        phases: [
          Phase(
            name: "Triển khai",
            status: "COMPLETED",
            tasks: [
              Task(name: "Cài đặt app", status: "DONE", assignee: "Phạm Văn C"),
              Task(name: "Đào tạo nhân sự", status: "DONE", assignee: "Nguyễn Thị D"),
            ],
          ),
        ],
      ),
      Project(
        name: "Website bán hàng",
        code: "DOC003",
        pmName: "Phạm Văn C",
        status: "NEW",
        progress: 0.1,
        phases: [],
      ),
      Project(
        name: "CRM nâng cao",
        code: "DOC004",
        pmName: "Lê Thị D",
        status: "IN_PROGRESS",
        progress: 0.45,
        phases: [
          Phase(
            name: "Tích hợp hệ thống",
            status: "IN_PROGRESS",
            tasks: [
              Task(name: "Tích hợp API", status: "IN_PROGRESS", assignee: null),
              Task(name: "Test tích hợp", status: "NEW", assignee: "Trần Văn E"),
            ],
          ),
        ],
      ),
    ];

    applyFilter();
  }

  void applyFilter() {
    setState(() {
      filteredProjects = allProjects.where((project) {
        final matchesSearch = project.name.toLowerCase().contains(
              searchTerm.toLowerCase(),
            );
        final matchesStatus =
            selectedStatus == null || project.status == selectedStatus;
        return matchesSearch && matchesStatus;
      }).toList();
    });
  }

  Color getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return Colors.green;
      case 'IN_PROGRESS':
        return Colors.orange;
      case 'NEW':
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  String getStatusDisplayName(String status) {
    switch (status) {
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'IN_PROGRESS':
        return 'Đang làm';
      case 'NEW':
        return 'Mới';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Danh sách Dự án")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Search + Filter
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: '🔍 Tìm kiếm dự án',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (val) {
                      searchTerm = val;
                      applyFilter();
                    },
                  ),
                ),
                const SizedBox(width: 12),
                DropdownButton<String?>(
                  hint: const Text("Lọc trạng thái"),
                  value: selectedStatus,
                  items: [null, 'NEW', 'IN_PROGRESS', 'COMPLETED'].map((status) {
                    return DropdownMenuItem(
                      value: status,
                      child: Text(
                        status == null ? "Tất cả" : getStatusDisplayName(status),
                      ),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      selectedStatus = value;
                    });
                    applyFilter();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Project List
            Expanded(
              child: filteredProjects.isEmpty
                  ? const Center(child: Text("Không có dự án nào."))
                  : ListView.builder(
                      itemCount: filteredProjects.length,
                      itemBuilder: (context, index) {
                        final project = filteredProjects[index];
                        return Card(
                          elevation: 3,
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ProjectDetailPage(project: project),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    project.name,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text("📄 Mã công văn: ${project.code}"),
                                      ),
                                      Expanded(
                                        child: Text("👤 PM: ${project.pmName}"),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "📌 Trạng thái: ${getStatusDisplayName(project.status)}",
                                    style: TextStyle(
                                      color: getStatusColor(project.status),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  LinearProgressIndicator(
                                    value: project.progress,
                                    color: getStatusColor(project.status),
                                    backgroundColor: Colors.grey.shade200,
                                  ),
                                  const SizedBox(height: 4),
                                  Text("${(project.progress * 100).toStringAsFixed(0)}%"),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
