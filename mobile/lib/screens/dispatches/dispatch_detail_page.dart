import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile/models/document.dart';
import 'package:mobile/models/enums/document_status.dart';
import 'package:mobile/models/enums/document_type.dart';
import 'package:mobile/services/document_service.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:intl/intl.dart';
import 'package:signature/signature.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:provider/provider.dart';

class DispatchDetailPage extends StatefulWidget {
  final int id;
  const DispatchDetailPage({super.key, required this.id});

  @override
  State<DispatchDetailPage> createState() => _DispatchDetailPageState();
}

class _DispatchDetailPageState extends State<DispatchDetailPage> {
  DocumentModel? document;
  bool isLoading = true;
  String? previewHtml;

  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.blue,
  );

  // NOTE
  final TextEditingController _noteController = TextEditingController();
  bool _noteSaving = false;

  @override
  void initState() {
    super.initState();
    fetchDetail();
  }

  Future<void> fetchDetail() async {
    try {
      final doc = await DocumentService.getById(widget.id);
      final html = await DocumentService.getPreviewHtml(widget.id);
      setState(() {
        document = doc;
        previewHtml = html;
      });
      // Prefill note field (nếu MANAGER mở lại muốn sửa/ghi đè)
      _noteController.text = doc.managerNote ?? '';
    } catch (e) {
      // ignore: avoid_print
      print("Error fetching detail: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<bool> handleSign(Uint8List signatureBytes) async {
    try {
      final base64 = base64Encode(signatureBytes);
      final res = await DocumentService.signDocument(widget.id, base64);
      if (res.status == 200) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text("Ký công văn thành công")));
        await fetchDetail();
        return true;
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.message ?? "Ký công văn thất bại")),
        );
        return false;
      }
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text("Lỗi khi ký công văn")));
      return false;
    }
  }

  Future<void> handleSubmitNote() async {
    final note = _noteController.text.trim();
    if (note.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text("Vui lòng nhập ghi chú")));
      return;
    }
    setState(() => _noteSaving = true);
    try {
      final res = await DocumentService.addManagerNote(widget.id, note);
      if (res.status == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Đã lưu ghi chú")),
        );
        await fetchDetail(); // sync lại UI
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.message ?? "Lưu ghi chú thất bại")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Có lỗi khi lưu ghi chú")),
      );
    } finally {
      setState(() => _noteSaving = false);
    }
  }

  Widget buildField(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              "$label:",
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value ?? "-",
              style: const TextStyle(color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  String getEnumDisplayName(dynamic enumValue) {
    if (enumValue == null) return '-';
    if (enumValue is DocumentStatus) return enumValue.displayName;
    if (enumValue is DocumentType) return enumValue.displayName;
    return enumValue.toString();
  }

  void showSignDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("✍️ Ký công văn"),
          content: SizedBox(
            width: double.maxFinite,
            height: 320,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("Chữ ký điện tử của bạn"),
                const SizedBox(height: 8),
                Expanded(
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.black26),
                      borderRadius: BorderRadius.circular(8),
                      color: Colors.grey.shade100,
                    ),
                    child: Signature(
                      controller: _signatureController,
                      backgroundColor: Colors.grey.shade100,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => _signatureController.clear(),
                  child: const Text("Xóa chữ ký"),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Hủy"),
            ),
            ElevatedButton(
              onPressed: () async {
                if (_signatureController.isNotEmpty) {
                  final signature = await _signatureController.toPngBytes();
                  if (signature != null) {
                    final result = await handleSign(signature);
                    if (result) {
                      Navigator.pop(context, 'signed');
                    }
                  }
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Bạn cần ký trước khi xác nhận.")),
                  );
                }
              },
              child: const Text("✅ Xác nhận ký"),
            ),
          ],
        );
      },
    );
  }
  Future<void> _openEdit() async {
    await Navigator.pushNamed(context, '/management/documents/${document!.id}/edit');
    await fetchDetail();
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (document == null) {
      return const Scaffold(
        body: Center(child: Text("Không tìm thấy công văn")),
      );
    }

    final doc = document!;
    final currentUser = Provider.of<AuthProvider>(context, listen: false).account;
    final isManager = currentUser?.role == 'MANAGER';
    final isSecretary  = currentUser?.role == 'SECRETARY';
    final hasManagerNote = (doc.managerNote ?? '').trim().isNotEmpty;
    final canManagerNote = isManager && doc.status == DocumentStatus.NEW;

    final canOpenEdit =
        isSecretary && doc.status == DocumentStatus.NEW && hasManagerNote;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Chi tiết công văn"),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          if (doc.status == DocumentStatus.NEW &&
              doc.signature == null &&
              isManager)
            IconButton(
              onPressed: showSignDialog,
              icon: const Icon(Icons.edit_document),
              tooltip: "Ký điện tử",
            ),
          if (canOpenEdit)
            IconButton(icon: const Icon(Icons.edit), tooltip: "Chỉnh sửa theo ghi chú", onPressed: _openEdit),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thông tin cơ bản
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc.title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      )),
                  const SizedBox(height: 12),
                  buildField("Mã công văn", doc.code),
                  buildField("Người gửi", doc.createdBy),
                  buildField("Người nhận", doc.receiver),
                  buildField("Trạng thái", getEnumDisplayName(doc.status)),
                  buildField("Loại", getEnumDisplayName(doc.type)),
                  buildField(
                    "Ngày tạo",
                    DateFormat('dd/MM/yyyy').format(doc.createdAt),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Khu vực ghi chú của Giám đốc
            if (canManagerNote) ...[
              const SizedBox(height: 8),
              const Text(
                "🗒️ Ghi chú cho thư ký",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _noteController,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: "Nhập ghi chú yêu cầu chỉnh sửa...",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(
                  onPressed: _noteSaving ? null : handleSubmitNote,
                  child: Text(_noteSaving ? "Đang gửi..." : "Gửi yêu cầu chỉnh sửa"),
                ),
              ),
            ],
            if (hasManagerNote) ...[
              // ... thẻ ghi chú
              if (canOpenEdit)
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.edit),
                    label: const Text("Chỉnh sửa theo ghi chú"),
                    onPressed: _openEdit,
                  ),
                ),
            ],
            // Hiển thị ghi chú gần nhất (MANAGER/ADMIN/SECRETARY)
            if ((currentUser?.role == 'MANAGER' ||
                    currentUser?.role == 'ADMIN' ||
                    currentUser?.role == 'SECRETARY') &&
                (doc.managerNote != null && doc.managerNote!.trim().isNotEmpty)) ...[
              const SizedBox(height: 16),
              const Text(
                "🗒️ Ghi chú mới nhất từ Giám đốc",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  border: Border.all(color: Colors.orange.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(doc.managerNote!),
              ),
            ],

            const SizedBox(height: 24),

            // Preview Word -> HTML
            if (previewHtml != null) ...[
              const Text(
                "📄 Xem trước công văn (Word):",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Html(data: previewHtml!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _signatureController.dispose();
    _noteController.dispose();
    super.dispose();
  }
}
