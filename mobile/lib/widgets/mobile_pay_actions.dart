import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // Clipboard
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';

class MobilePayActions extends StatelessWidget {
  const MobilePayActions({
    super.key,
    required this.bankCode,    // ví dụ: 'TPBank'
    required this.accountNo,   // '65609062003'
    required this.amount,      // 100000
    required this.content,     // 'TOPUP-ABC123'
    required this.qrUrl,       // URL ảnh VietQR đã render từ BE
  });

  final String bankCode, accountNo, content, qrUrl;
  final int amount;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton.icon(
          icon: const Icon(Icons.open_in_new),
          label: const Text('Mở app ngân hàng'),
          onPressed: _openBankAppOrWeb,
        ),
        OutlinedButton.icon(
          icon: const Icon(Icons.content_copy),
          label: const Text('Copy nội dung'),
          onPressed: () => _copy(context, content),
        ),
        OutlinedButton.icon(
          icon: const Icon(Icons.account_balance),
          label: Text(isWide ? 'Copy STK & số tiền' : 'Copy STK & tiền'),
          onPressed: () => _copy(context, 'STK: $accountNo\nSố tiền: $amount\nND: $content'),
        ),
        TextButton.icon(
          icon: const Icon(Icons.ios_share),
          label: const Text('Chia sẻ chi tiết'),
          onPressed: () => Share.share(
            'Ngân hàng: $bankCode\nSTK: $accountNo\nSố tiền: $amount\nNội dung: $content',
          ),
        ),
        TextButton.icon(
          icon: const Icon(Icons.qr_code_2),
          label: const Text('Lưu QR vào thư viện'),
          onPressed: _saveQrToGallery,
        ),
      ],
    );
  }

  Future<void> _openBankAppOrWeb() async {
    // TODO: nếu có deeplink riêng của bank thì đặt ở đây trước (tpbank://..., vcbpay://..., ...)
    // Fallback: mở URL ảnh QR (để user lưu rồi vào app NH chọn "Quét từ thư viện")
    final web = Uri.parse(qrUrl);
    await launchUrl(web, mode: LaunchMode.externalApplication);
  }

  Future<void> _saveQrToGallery() async {
    if (!(await _ensurePhotosPermission())) return;
    try {
      final res = await Dio().get<List<int>>(
        qrUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = Uint8List.fromList(res.data!);
      await ImageGallerySaver.saveImage(
        bytes,
        name: 'vietqr_${DateTime.now().millisecondsSinceEpoch}',
      );
    } catch (e) {
      if (kDebugMode) print('Save QR error: $e');
    }
  }

  Future<bool> _ensurePhotosPermission() async {
    // Android 13+: READ_MEDIA_IMAGES (mapped qua Permission.photos)
    var status = await Permission.photos.request();
    if (status.isGranted) return true;

    // Fallback Android cũ: storage (tuỳ ROM)
    if (await Permission.storage.request().isGranted) return true;

    await openAppSettings();
    return false;
  }

  void _copy(BuildContext context, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã sao chép')),
      );
    }
  }
}
