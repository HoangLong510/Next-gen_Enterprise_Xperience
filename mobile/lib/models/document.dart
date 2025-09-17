import 'package:mobile/models/enums/document_status.dart';
import 'package:mobile/models/enums/document_type.dart';

class DocumentModel {
  final int id;
  final String code;
  final String title;
  final String content;
  final String? fileUrl;
  final String createdBy;
  final String? receiver;
  final int? relatedProjectId;
  final DateTime createdAt;
  final DocumentStatus status;
  final DocumentType type;
  final String? signature;
  final String? previewHtml;

  // 📝 Thêm trường ghi chú của giám đốc
  final String? managerNote;

  // Project fields
  final String? projectName;
  final String? projectDescription;
  final String? projectPriority;
  final String? projectDeadline;
  final String? pmName;
  final int? pmId;

  // Fund fields
  final String? fundName;
  final double? fundBalance;
  final String? fundPurpose;
  final String? accountantName;

  DocumentModel({
    required this.id,
    required this.code,
    required this.title,
    required this.content,
    required this.fileUrl,
    required this.createdBy,
    required this.receiver,
    required this.relatedProjectId,
    required this.createdAt,
    required this.status,
    required this.type,
    required this.signature,
    required this.previewHtml,
    this.managerNote,
    this.projectName,
    this.projectDescription,
    this.projectPriority,
    this.projectDeadline,
    this.pmName,
    this.pmId,
    this.fundName,
    this.fundBalance,
    this.fundPurpose,
    this.accountantName,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {

    double? _toDouble(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString());
    }

    int? _toInt(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toInt();
      return int.tryParse(v.toString());
    }

    return DocumentModel(
      id: _toInt(json['id']) ?? 0,
      code: json['code']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      fileUrl: json['fileUrl']?.toString(),
      createdBy: json['createdBy']?.toString() ?? '',
      receiver: json['receiver']?.toString(),
      relatedProjectId: _toInt(json['relatedProjectId']),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      status: DocumentStatusX.fromString(json['status']),
      type: DocumentTypeX.fromString(json['type']),
      signature: json['signature']?.toString(),
      previewHtml: json['previewHtml']?.toString(),

      managerNote: json['managerNote']?.toString(),

      projectName: json['projectName']?.toString(),
      projectDescription: json['projectDescription']?.toString(),
      projectPriority: json['projectPriority']?.toString(),
      projectDeadline: json['projectDeadline']?.toString(),
      pmName: json['pmName']?.toString(),
      pmId: _toInt(json['pmId']),

      fundName: json['fundName']?.toString(),
      fundBalance: _toDouble(json['fundBalance']),
      fundPurpose: json['fundPurpose']?.toString(),
      accountantName: json['accountantName']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'title': title,
      'content': content,
      'fileUrl': fileUrl,
      'createdBy': createdBy,
      'receiver': receiver,
      'relatedProjectId': relatedProjectId,
      'createdAt': createdAt.toIso8601String(),
      'status': status.name,
      'type': type.name,
      'signature': signature,
      'previewHtml': previewHtml,

      'managerNote': managerNote,

      'projectName': projectName,
      'projectDescription': projectDescription,
      'projectPriority': projectPriority,
      'projectDeadline': projectDeadline,
      'pmId': pmId,

      'fundName': fundName,
      'fundBalance': fundBalance,
      'fundPurpose': fundPurpose,
      'accountantName': accountantName,
    };
  }

}
