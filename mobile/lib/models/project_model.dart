import 'enums/project_status.dart';
import 'package:mobile/models/project_task_model.dart';
class ProjectModel {
  final int id;
  final String name;
  final String? description;
  final DateTime? createdAt;
  final DateTime? deadline;
  final ProjectStatus status;
  final String? repoLink; // BE trả sẵn repoLink nếu có

  final int? documentId;
  final String? documentCode;

  final int? pmId;
  final String? pmName;

  final int totalTask;
  final int doneTask;
  /// BE trả progress là số nguyên 0..100
  final int progress;

  final DateTime? completedAt;

  final List<ProjectTaskModel> tasks; // danh sách task hợp lệ (không gồm CANCELED)

  ProjectModel({
    required this.id,
    required this.name,
    this.description,
    this.createdAt,
    this.deadline,
    required this.status,
    this.repoLink,
    this.documentId,
    this.documentCode,
    this.pmId,
    this.pmName,
    required this.totalTask,
    required this.doneTask,
    required this.progress,
    this.completedAt,
    required this.tasks,
  });

  double get progressRatio => (progress.clamp(0, 100)) / 100.0;

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    final List tasksJson = (json['tasks'] as List?) ?? const [];

    return ProjectModel(
      id: (json['id'] is int)
          ? json['id'] as int
          : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '-',
      description: json['description']?.toString(),
      createdAt: _parseDate(json['createdAt']),
      deadline: _parseDate(json['deadline']),
      status: ProjectStatusX.fromString(json['status']?.toString() ?? 'PLANNING'),
      repoLink: json['repoLink']?.toString(),
      documentId: (json['documentId'] is int)
          ? json['documentId']
          : (json['documentId'] != null
              ? int.tryParse(json['documentId'].toString())
              : null),
      documentCode: json['documentCode']?.toString(),
      pmId: (json['pmId'] is int)
          ? json['pmId']
          : (json['pmId'] != null ? int.tryParse(json['pmId'].toString()) : null),
      pmName: json['pmName']?.toString(),
      totalTask: (json['totalTask'] is int)
          ? json['totalTask']
          : int.tryParse(json['totalTask']?.toString() ?? '') ?? 0,
      doneTask: (json['doneTask'] is int)
          ? json['doneTask']
          : int.tryParse(json['doneTask']?.toString() ?? '') ?? 0,
      progress: (json['progress'] is int)
          ? json['progress']
          : int.tryParse(json['progress']?.toString() ?? '') ?? 0,
      completedAt: _parseDate(json['completedAt']),
      tasks: tasksJson.map((e) => ProjectTaskModel.fromJson(e)).toList().cast<ProjectTaskModel>(),
    );
  }
}