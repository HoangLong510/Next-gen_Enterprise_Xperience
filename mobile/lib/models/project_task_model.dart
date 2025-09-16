// lib/models/project_task_model.dart
import 'enums/task_size.dart';

class ProjectTaskModel {
  final int id;
  final String name;
  final String? description;
  final DateTime? deadline;

  /// BE: PLANNING / IN_PROGRESS / IN_REVIEW / COMPLETED / CANCELED  (uppercase)
  final String status;

  final TaskSize? size;
  final int totalSubtasks;
  final int doneSubtasks;

  final String? assigneeName;
  final String? assigneeUsername;
  final int? assigneeId;

  /// Dùng để lọc theo Phase ở FE (Kanban theo phase).
  final int? phaseId;

  final String? githubBranch;
  final bool? branchCreated;
  final String? pullRequestUrl;
  final bool? merged;
  final DateTime? mergedAt;

  final bool? hidden;

  const ProjectTaskModel({
    required this.id,
    required this.name,
    this.description,
    this.deadline,
    required this.status,
    this.size,
    this.totalSubtasks = 0,
    this.doneSubtasks = 0,
    this.assigneeName,
    this.assigneeUsername,
    this.assigneeId,
    this.phaseId,
    this.githubBranch,
    this.branchCreated,
    this.pullRequestUrl,
    this.merged,
    this.mergedAt,
    this.hidden,
  });

  factory ProjectTaskModel.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic v) {
      if (v == null) return null;
      try { return DateTime.parse(v.toString()); } catch (_) { return null; }
    }

    int? _parseInt(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      return int.tryParse(v.toString());
    }

    // Chuẩn hoá status: trim + UPPERCASE; default về PLANNING
    final rawStatus = json['status']?.toString();
    final normalizedStatus = (rawStatus != null && rawStatus.trim().isNotEmpty)
        ? rawStatus.trim().toUpperCase()
        : 'PLANNING';

    return ProjectTaskModel(
      id: _parseInt(json['id']) ?? 0,
      name: json['name']?.toString() ?? '-',
      description: json['description']?.toString(),
      deadline: _parseDate(json['deadline']),
      status: normalizedStatus,
      size: TaskSizeX.fromString(json['size']?.toString()),
      totalSubtasks: _parseInt(json['totalSubtasks']) ?? 0,
      doneSubtasks: _parseInt(json['doneSubtasks']) ?? 0,
      assigneeName: json['assigneeName']?.toString(),
      assigneeUsername: json['assigneeUsername']?.toString(),
      assigneeId: _parseInt(json['assigneeId']),
      phaseId: _parseInt(json['phaseId']), // ✅ quan trọng để lọc theo phase
      githubBranch: json['githubBranch']?.toString(),
      branchCreated: json['branchCreated'] as bool?,
      pullRequestUrl: json['pullRequestUrl']?.toString(),
      merged: json['merged'] as bool?,
      mergedAt: _parseDate(json['mergedAt']),
      hidden: json['hidden'] as bool?,
    );
  }

  /// Dùng cho Optimistic UI
  ProjectTaskModel copyWith({
    String? status,
    TaskSize? size,
    String? githubBranch,
    int? phaseId,
  }) {
    return ProjectTaskModel(
      id: id,
      name: name,
      description: description,
      deadline: deadline,
      status: (status ?? this.status).trim().toUpperCase(),
      size: size ?? this.size,
      totalSubtasks: totalSubtasks,
      doneSubtasks: doneSubtasks,
      assigneeName: assigneeName,
      assigneeUsername: assigneeUsername,
      assigneeId: assigneeId,
      phaseId: phaseId ?? this.phaseId,
      githubBranch: githubBranch ?? this.githubBranch,
      branchCreated: branchCreated,
      pullRequestUrl: pullRequestUrl,
      merged: merged,
      mergedAt: mergedAt,
      hidden: hidden,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'deadline': deadline?.toIso8601String(),
      'status': status,           // uppercase
      'size': size?.name,         // S/M/L
      'totalSubtasks': totalSubtasks,
      'doneSubtasks': doneSubtasks,
      'assigneeName': assigneeName,
      'assigneeUsername': assigneeUsername,
      'assigneeId': assigneeId,
      'phaseId': phaseId,         // ✅ xuất kèm
      'githubBranch': githubBranch,
      'branchCreated': branchCreated,
      'pullRequestUrl': pullRequestUrl,
      'merged': merged,
      'mergedAt': mergedAt?.toIso8601String(),
      'hidden': hidden,
    };
  }
}
