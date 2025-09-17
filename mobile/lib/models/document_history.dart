import 'package:mobile/models/account.dart';

class DocumentHistory {
  final int id;
  final int version;
  final String action;
  final Account? createdBy;
  final String? title;
  final String? content;
  final String? fileUrl;

  // Project snapshot
  final String? projectName;
  final String? projectDescription;
  final String? projectPriority;
  final String? projectDeadline;

  // Fund snapshot
  final String? fundName;
  final double? fundBalance;
  final String? fundPurpose;

  final String? type;
  final String? status;
  final String? signature;
  final String? managerNote;
  final DateTime? createdAt;

  DocumentHistory({
    required this.id,
    required this.version,
    required this.action,
    this.createdBy,
    this.title,
    this.content,
    this.fileUrl,
    this.projectName,
    this.projectDescription,
    this.projectPriority,
    this.projectDeadline,
    this.fundName,
    this.fundBalance,
    this.fundPurpose,
    this.type,
    this.status,
    this.signature,
    this.managerNote,
    this.createdAt,
  });

  factory DocumentHistory.fromJson(Map<String, dynamic> json) {
    int _toInt(dynamic v) {
      if (v == null) return 0;
      if (v is int) return v;
      return int.tryParse(v.toString()) ?? 0;
    }

    double? _toDouble(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString());
    }

    DateTime? _toDate(dynamic v) {
      if (v == null) return null;
      try { return DateTime.parse(v.toString()); } catch (_) { return null; }
    }

    return DocumentHistory(
      id: _toInt(json['id']),
      version: _toInt(json['version']),
      action: json['action']?.toString() ?? '',
      createdBy: json['createdBy'] != null ? Account.fromJson(json['createdBy']) : null,
      title: json['title']?.toString(),
      content: json['content']?.toString(),
      fileUrl: json['fileUrl']?.toString(),
      projectName: json['projectName']?.toString(),
      projectDescription: json['projectDescription']?.toString(),
      projectPriority: json['projectPriority']?.toString(),
      projectDeadline: json['projectDeadline']?.toString(),
      fundName: json['fundName']?.toString(),
      fundBalance: _toDouble(json['fundBalance']),
      fundPurpose: json['fundPurpose']?.toString(),
      type: json['type']?.toString(),
      status: json['status']?.toString(),
      signature: json['signature']?.toString(),
      managerNote: json['managerNote']?.toString(),
      createdAt: _toDate(json['createdAt']),
    );
  }
}
