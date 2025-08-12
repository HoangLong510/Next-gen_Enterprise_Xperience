import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile/permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mobile/services/attendance_service.dart';
import 'package:mobile/models/enums/attendance_status.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:provider/provider.dart';

// để lấy trường từ response Attendance
import 'package:mobile/models/attendance_model.dart';

class CheckInCheckOutPage extends StatefulWidget {
  const CheckInCheckOutPage({super.key});

  @override
  State<CheckInCheckOutPage> createState() => _CheckInCheckOutPageState();
}

class _CheckInCheckOutPageState extends State<CheckInCheckOutPage> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;
  bool _isLoading = false;
  AttendanceStatus _status = AttendanceStatus.NOT_CHECKED_IN;

  // ✨ state mới
  File? _capturedFile;
  double? _lastDistanceKm;
  bool? _lastMatch;
  bool? _lastLocationOk;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    await requestPermissions();

    final account = context.read<AuthProvider>().account;
    if (account == null) return;

    final statusString = await AttendanceService.getTodayStatus(account.id!);
    setState(() {
      _status = AttendanceStatusExtension.fromString(statusString);
    });

    if (_status != AttendanceStatus.CHECKED_OUT) {
      await _initializeCamera();
    }
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _showError('Thiết bị không có camera khả dụng');
        return;
      }

      final frontCamera = cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await _cameraController!.initialize();

      if (!mounted) return;
      setState(() => _isCameraInitialized = true);
    } catch (e) {
      _showError('Lỗi khởi tạo camera: $e');
    }
  }

  // ✨ chỉ chụp ảnh, chưa gửi
  Future<void> _takePhoto() async {
    if (!_isCameraInitialized || _cameraController == null) return;
    try {
      final xFile = await _cameraController!.takePicture();
      final dir = await getTemporaryDirectory();
      final imagePath =
          '${dir.path}/captured_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final file = await File(xFile.path).copy(imagePath);
      setState(() {
        _capturedFile = file;
        // reset kết quả cũ
        _lastDistanceKm = null;
        _lastMatch = null;
        _lastLocationOk = null;
      });
    } catch (e) {
      _showError('Lỗi chụp ảnh: $e');
    }
  }

  // ✨ gửi checkin/checkout dùng ảnh đã chụp
  Future<void> _submitAttendance() async {
    if (_capturedFile == null) {
      _showError('Hãy chụp ảnh trước khi gửi');
      return;
    }

    setState(() => _isLoading = true);
    final account = context.read<AuthProvider>().account;
    if (account == null) {
      _showError('Không tìm thấy tài khoản');
      setState(() => _isLoading = false);
      return;
    }

    try {
      // GPS on?
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showError('Vui lòng bật dịch vụ định vị (GPS)');
        await Geolocator.openLocationSettings();
        return;
      }

      // Permission
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showError('Bạn đã từ chối quyền truy cập vị trí');
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        _showError(
          'Bạn đã từ chối quyền truy cập vị trí vĩnh viễn. Hãy bật lại trong cài đặt.',
        );
        await Geolocator.openAppSettings();
        return;
      }

      // Lấy fix mới
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 10),
      );
      debugPrint('Gửi tọa độ: lat=${pos.latitude}, long=${pos.longitude}');
      debugPrint('Gửi ảnh path: ${_capturedFile!.path}');

      Attendance res;
      if (_status == AttendanceStatus.NOT_CHECKED_IN) {
        res = await AttendanceService.checkInFace(
          accountId: account.id!,
          imageFile: _capturedFile!,
          latitude: pos.latitude,
          longitude: pos.longitude,
        );
        _showSuccess('Check in thành công');
        setState(() => _status = AttendanceStatus.CHECKED_IN);
      } else {
        res = await AttendanceService.checkOutFace(
          accountId: account.id!,
          imageFile: _capturedFile!,
          latitude: pos.latitude,
          longitude: pos.longitude,
        );
        _showSuccess('Check out thành công');
        setState(() => _status = AttendanceStatus.CHECKED_OUT);
      }

      // Lưu kết quả để hiển thị icon/chi tiết
      setState(() {
        _lastDistanceKm = res.distanceKm;
        _lastMatch = res.faceMatch;
        _lastLocationOk = res.locationValid;
      });
    } catch (e) {
      _showError('Lỗi gửi chấm công: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Widget _resultCard() {
    if (_lastDistanceKm == null &&
        _lastMatch == null &&
        _lastLocationOk == null)
      return const SizedBox.shrink();

    final okColor = Colors.green;
    final badColor = Colors.red;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      margin: const EdgeInsets.only(top: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.place, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Khoảng cách: ${_lastDistanceKm?.toStringAsFixed(2) ?? '-'} km',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  _lastLocationOk == true ? Icons.check_circle : Icons.cancel,
                  color: _lastLocationOk == true ? okColor : badColor,
                ),
                const SizedBox(width: 8),
                Text('Vị trí hợp lệ'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  _lastMatch == true ? Icons.verified : Icons.error_outline,
                  color: _lastMatch == true ? okColor : badColor,
                ),
                const SizedBox(width: 8),
                Text('Khuôn mặt khớp'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCheckedOut = _status == AttendanceStatus.CHECKED_OUT;

    return Scaffold(
      appBar: AppBar(title: const Text('Chấm công bằng khuôn mặt')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: isCheckedOut
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, color: Colors.green, size: 80),
                    SizedBox(height: 16),
                    Text(
                      'Bạn đã hoàn thành chấm công hôm nay.',
                      style: TextStyle(fontSize: 20),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            : SingleChildScrollView(
                child: Column(
                  children: [
                    if (_isCameraInitialized && _cameraController != null)
                      Column(
                        children: [
                          AspectRatio(
                            aspectRatio: _cameraController!.value.aspectRatio,
                            child: CameraPreview(_cameraController!),
                          ),
                          const SizedBox(height: 12),
                          Center(
                            child: FloatingActionButton(
                              onPressed: _isLoading ? null : _takePhoto,
                              backgroundColor: Colors.white,
                              child: const Icon(
                                Icons.camera_alt,
                                color: Colors.black,
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      const Center(child: CircularProgressIndicator()),

                    // ✨ preview ảnh đã chụp (nếu có)
                    if (_capturedFile != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          _capturedFile!,
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),

                    const SizedBox(height: 12),

                    // ✨ nút GỬI (check in/out) – chỉ bật khi đã chụp ảnh
                    ElevatedButton.icon(
                      onPressed: (_capturedFile == null || _isLoading)
                          ? null
                          : _submitAttendance,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(
                              _status == AttendanceStatus.NOT_CHECKED_IN
                                  ? Icons.login
                                  : Icons.logout,
                            ),
                      label: Text(
                        _status == AttendanceStatus.NOT_CHECKED_IN
                            ? 'Gửi Check In'
                            : 'Gửi Check Out',
                      ),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                    ),

                    // ✨ card hiển thị kết quả match/location/distance
                    _resultCard(),
                  ],
                ),
              ),
      ),
    );
  }
}
