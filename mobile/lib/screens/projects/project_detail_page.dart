import 'package:flutter/material.dart';
import 'package:mobile/screens/projects/kanban_board_page.dart';
import 'package:mobile/models/project_model.dart';

class ProjectDetailPage extends StatefulWidget {
  final Project project;

  const ProjectDetailPage({super.key, required this.project});

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> {
  int? expandedPhaseIndex;
  String searchTask = '';

  @override
  Widget build(BuildContext context) {
    final phases = widget.project.phases;

    return Scaffold(
      appBar: AppBar(title: Text(widget.project.name)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Project Info
            Card(
              elevation: 3,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.project.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text("📄 Mã công văn: ${widget.project.code}"),
                    Text("👤 PM: ${widget.project.pmName}"),
                    Text("📌 Trạng thái: ${widget.project.status}"),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: widget.project.progress,
                      color: Colors.green,
                      backgroundColor: Colors.grey.shade200,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "${(widget.project.progress * 100).toStringAsFixed(0)}%",
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Search Task
            TextField(
              decoration: const InputDecoration(
                labelText: '🔍 Tìm kiếm Task',
                border: OutlineInputBorder(),
              ),
              onChanged: (val) {
                setState(() {
                  searchTask = val.toLowerCase();
                });
              },
            ),
            const SizedBox(height: 16),

            // Phases List
            Expanded(
              child: ListView.builder(
                itemCount: phases.length,
                itemBuilder: (context, index) {
                  final phase = phases[index];
                  final isExpanded = expandedPhaseIndex == index;

                  final filteredTasks = phase.tasks.where((task) {
                    return task.name.toLowerCase().contains(searchTask);
                  }).toList();

                  return Card(
                    elevation: 2,
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      children: [
                        ListTile(
                          title: GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => KanbanBoardPage(phase: phase),
                                ),
                              );
                            },
                            child: Text(
                              "Phase ${index + 1}: ${phase.name}",
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          subtitle: Text("Trạng thái: ${phase.status}"),
                          trailing: IconButton(
                            icon: Icon(
                              isExpanded
                                  ? Icons.keyboard_arrow_up
                                  : Icons.keyboard_arrow_down,
                            ),
                            onPressed: () {
                              setState(() {
                                expandedPhaseIndex = isExpanded ? null : index;
                              });
                            },
                          ),
                        ),
                        if (isExpanded)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            child: Column(
                              children: filteredTasks.isEmpty
                                  ? [const Text("Không có task nào phù hợp.")]
                                  : filteredTasks.map((task) {
                                      return ListTile(
                                        contentPadding: EdgeInsets.zero,
                                        leading: const Icon(Icons.task_alt),
                                        title: Text(task.name),
                                        subtitle: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text("Trạng thái: ${task.status}"),
                                            Text(
                                              "Assignee: ${task.assignee ?? 'Chưa được assign'}",
                                              style: const TextStyle(
                                                fontStyle: FontStyle.italic,
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    }).toList(),
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
    );
  }
}
