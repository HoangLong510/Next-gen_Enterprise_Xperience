// lib/models/project_model.dart
import 'package:mobile/models/enums/project_status.dart';
import 'package:mobile/models/project_task_model.dart';

class ProjectModel {
  final int id;
  final String name;
  final String? description;
  final DateTime? createdAt;
  final DateTime? deadline;
  final ProjectStatus status;

  /// BE trả sẵn repoLink nếu có
  final String? repoLink;

  final int? documentId;
  final String? documentCode;
  final int? pmId;
  final String? pmName;

  /// Tổng số task hợp lệ (không tính CANCELED) mà BE trả
  final int totalTask;
  final int doneTask;

  /// BE trả progress là số nguyên 0..100
  final int progress;

  final DateTime? completedAt;

  /// Danh sách task hợp lệ (không gồm CANCELED)
  final List<ProjectTaskModel> tasks;

  const ProjectModel({
    required this.id,
    required this.name,
    this.description,
    this.createdAt,
    this.deadline,
    required this.status, // ✅ THÊM DÒNG NÀY
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

  /// Tỉ lệ progress 0.0..1.0
  double get progressRatio =>
      ((progress).clamp(0, 100) as num).toDouble() / 100.0;

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic v) {
      if (v == null) return null;
      try { return DateTime.parse(v.toString()); } catch (_) { return null; }
    }

    int _readInt(dynamic v, {int defaultValue = 0}) {
      if (v == null) return defaultValue;
      if (v is int) return v;
      return int.tryParse(v.toString()) ?? defaultValue;
    }

    final List<dynamic> tasksJson = json['tasks'] as List<dynamic>? ?? const [];

    return ProjectModel(
      id: _readInt(json['id']),
      name: (json['name']?.toString() ?? '-'),
      description: json['description']?.toString(),
      createdAt: _parseDate(json['createdAt']),
      deadline: _parseDate(json['deadline']),
      status: ProjectStatusX.fromString(json['status']?.toString() ?? 'PLANNING'),
      repoLink: json['repoLink']?.toString(),
      documentId: json['documentId'] == null ? null : _readInt(json['documentId']),
      documentCode: json['documentCode']?.toString(),
      pmId: json['pmId'] == null ? null : _readInt(json['pmId']),
      pmName: json['pmName']?.toString(),
      totalTask: _readInt(json['totalTask']),
      doneTask: _readInt(json['doneTask']),
      progress: _readInt(json['progress']),
      completedAt: _parseDate(json['completedAt']),
      tasks: tasksJson
          .whereType<Map<String, dynamic>>()
          .map(ProjectTaskModel.fromJson)
          .toList(growable: false),
    );
  }
}
