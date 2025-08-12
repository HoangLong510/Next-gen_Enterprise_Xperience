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
    } catch (e) {
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Ký công văn thành công")));
        await fetchDetail(); // hoặc bỏ nếu không cần load lại tại đây
        return true;
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.message ?? "Ký công văn thất bại")),
        );
        return false;
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Lỗi khi ký công văn")));
      return false;
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
            height: 320, // Đặt chiều cao cố định
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
                      Navigator.pop(
                        context,
                        'signed',
                      ); // chỉ pop khi ký thành công
                    }
                  }
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Bạn cần ký trước khi xác nhận."),
                    ),
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
    final currentUser = Provider.of<AuthProvider>(
      context,
      listen: false,
    ).account;
    return Scaffold(
      appBar: AppBar(
        title: const Text("Chi tiết công văn"),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          if (doc.status == DocumentStatus.NEW &&
              doc.signature == null &&
              currentUser?.role == 'MANAGER') // ✅ Thêm điều kiện này
            IconButton(
              onPressed: showSignDialog,
              icon: const Icon(Icons.edit_document),
              tooltip: "Ký điện tử",
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                  Text(
                    doc.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
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
            const SizedBox(height: 24),
            if (previewHtml != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }
}
