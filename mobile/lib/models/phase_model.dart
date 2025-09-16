import 'enums/phase_status.dart';
import 'project_task_model.dart';

class PhaseModel {
  final int id;
  final String name;
  final PhaseStatus status;
  final int? sequence;
  final DateTime? deadline;
  final List<ProjectTaskModel> tasks;

  PhaseModel({
    required this.id,
    required this.name,
    required this.status,
    this.sequence,
    this.deadline,
    required this.tasks,
  });

  factory PhaseModel.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic v) {
      if (v == null) return null;
      try { return DateTime.parse(v.toString()); } catch (_) { return null; }
    }

    final List rawTasks = (json['tasks'] as List?) ?? const [];

    return PhaseModel(
      id: (json['id'] is int) ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '-',
      status: PhaseStatusX.fromString(json['status']?.toString() ?? 'PLANNING'),
      sequence: json['sequence'] is int ? json['sequence'] : int.tryParse('${json['sequence'] ?? ''}'),
      deadline: _parseDate(json['deadline']),
      tasks: rawTasks.map((e) => ProjectTaskModel.fromJson(e)).toList().cast<ProjectTaskModel>(),
    );
  }
}