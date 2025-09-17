// lib/models/phase_model.dart
import 'package:mobile/models/enums/phase_status.dart';
import 'package:mobile/models/project_task_model.dart';

class PhaseModel {
  final int id;
  final String name;
  final PhaseStatus status;
  final int? sequence;
  final DateTime? deadline;
  final List<ProjectTaskModel> tasks;

  const PhaseModel({
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
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    int? _readIntNullable(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      return int.tryParse(v.toString());
    }

    final List<dynamic> rawTasks = json['tasks'] as List<dynamic>? ?? const [];

    return PhaseModel(
      id: _readIntNullable(json['id']) ?? 0,
      name: json['name']?.toString() ?? '-',
      status: PhaseStatusX.fromString(json['status']?.toString() ?? 'PLANNING'),
      sequence: _readIntNullable(json['sequence']),
      deadline: _parseDate(json['deadline']),
      tasks: rawTasks
          .whereType<Map<String, dynamic>>()
          .map(ProjectTaskModel.fromJson)
          .toList(growable: false),
    );
  }
}
