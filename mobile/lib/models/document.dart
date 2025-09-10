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
    return DocumentModel(
      id: json['id'],
      code: json['code'],
      title: json['title'],
      content: json['content'],
      fileUrl: json['fileUrl'],
      createdBy: json['createdBy'],
      receiver: json['receiver'],
      relatedProjectId: json['relatedProjectId'],
      createdAt: DateTime.parse(json['createdAt']),
      status: DocumentStatusX.fromString(json['status']),
      type: DocumentTypeX.fromString(json['type']),
      signature: json['signature'],
      previewHtml: json['previewHtml'],

      // 📝 Lấy ghi chú từ BE
      managerNote: json['managerNote'],

      projectName: json['projectName'],
      projectDescription: json['projectDescription'],
      projectPriority: json['projectPriority'],
      projectDeadline: json['projectDeadline'],
      pmName: json['pmName'],
      pmId: json['pmId'],

      fundName: json['fundName'],
      fundBalance: (json['fundBalance'] != null) ? json['fundBalance'].toDouble() : null,
      fundPurpose: json['fundPurpose'],
      accountantName: json['accountantName'],
    );
  }
}
