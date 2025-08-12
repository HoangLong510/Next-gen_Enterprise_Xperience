import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/models/project_model.dart';

class KanbanBoardPage extends StatefulWidget {
  final Phase phase;

  const KanbanBoardPage({super.key, required this.phase});

  @override
  State<KanbanBoardPage> createState() => _KanbanBoardPageState();
}

class _KanbanBoardPageState extends State<KanbanBoardPage> {
  final List<String> statuses = ['NEW', 'IN_PROGRESS', 'DONE'];
  late Map<String, List<Task>> columns;
  String searchKeyword = '';
  late PageController _pageController;
  int currentPage = 0;
  Timer? _edgeDragTimer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _initColumns();
  }

  void _initColumns() {
    columns = {
      for (var status in statuses)
        status: widget.phase.tasks.where((t) => t.status == status).toList(),
    };
  }

  void _onTaskDropped({
    required String fromStatus,
    required String toStatus,
    required Task task,
    required int newIndex,
  }) {
    setState(() {
      columns[fromStatus]?.remove(task);
      final updatedTask = Task(
        name: task.name,
        assignee: task.assignee,
        status: toStatus,
      );
      final targetList = columns[toStatus]!;
      final safeIndex = newIndex.clamp(0, targetList.length);
      targetList.insert(safeIndex, updatedTask);
    });
  }

  void _startEdgeDragTimer({required bool isLeft}) {
    if (_edgeDragTimer != null && _edgeDragTimer!.isActive) return;

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

  void _cancelEdgeDragTimer() {
    _edgeDragTimer?.cancel();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _edgeDragTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Kanban: ${widget.phase.name}")),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                labelText: '🔍 Tìm kiếm Task',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                setState(() {
                  searchKeyword = value.toLowerCase();
                });
              },
            ),
          ),
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  currentPage = index;
                });
              },
              itemCount: statuses.length,
              itemBuilder: (context, index) {
                final status = statuses[index];
                final allTasks = columns[status]!;
                final tasks = allTasks
                    .where((t) => t.name.toLowerCase().contains(searchKeyword))
                    .toList();

                return Stack(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _getStatusDisplayName(status),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Expanded(
                            child: DragTarget<Task>(
                              onWillAccept: (_) => true,
                              onAcceptWithDetails: (details) {
                                final draggedTask = details.data;
                                final fromStatus = draggedTask.status;
                                _onTaskDropped(
                                  fromStatus: fromStatus,
                                  toStatus: status,
                                  task: draggedTask,
                                  newIndex: tasks.length,
                                );
                              },
                              builder: (context, candidateData, rejectedData) {
                                return ListView.builder(
                                  itemCount: tasks.length,
                                  itemBuilder: (context, taskIndex) {
                                    final task = tasks[taskIndex];
                                    return LongPressDraggable<Task>(
                                      data: task,
                                      dragAnchorStrategy: pointerDragAnchorStrategy,
                                      feedback: Material(
                                        elevation: 6,
                                        child: SizedBox(
                                          width: MediaQuery.of(context).size.width * 0.8,
                                          child: TaskCard(task: task),
                                        ),
                                      ),
                                      childWhenDragging: const SizedBox.shrink(),
                                      child: DragTarget<Task>(
                                        onWillAccept: (incomingTask) => incomingTask != task,
                                        onAccept: (incomingTask) {
                                          final fromStatus = incomingTask.status;
                                          _onTaskDropped(
                                            fromStatus: fromStatus,
                                            toStatus: status,
                                            task: incomingTask,
                                            newIndex: taskIndex,
                                          );
                                        },
                                        builder: (context, _, __) => TaskCard(task: task),
                                      ),
                                    );
                                  },
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
                        child: DragTarget<Task>(
                          onWillAccept: (_) {
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
                        child: DragTarget<Task>(
                          onWillAccept: (_) {
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
    );
  }

  String _getStatusDisplayName(String status) {
    switch (status) {
      case 'NEW':
        return 'Mới';
      case 'IN_PROGRESS':
        return 'Đang làm';
      case 'DONE':
        return 'Hoàn thành';
      default:
        return status;
    }
  }
}

class TaskCard extends StatelessWidget {
  final Task task;

  const TaskCard({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text("Trạng thái: ${_getStatusDisplayName(task.status)}"),
            Text(
              "Assignee: ${task.assignee ?? 'Chưa được assign'}",
              style: const TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }

  String _getStatusDisplayName(String status) {
    switch (status) {
      case 'NEW':
        return 'Mới';
      case 'IN_PROGRESS':
        return 'Đang làm';
      case 'DONE':
        return 'Hoàn thành';
      default:
        return status;
    }
  }
}
