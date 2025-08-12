import 'package:permission_handler/permission_handler.dart';

Future<void> requestPermissions() async {
  var cameraStatus = await Permission.camera.status;
  if (!cameraStatus.isGranted) {
    var result = await Permission.camera.request();
    if (result != PermissionStatus.granted) {
      print("Quyền camera bị từ chối");
    }
  }

  var locationStatus = await Permission.location.status;
  if (!locationStatus.isGranted) {
    var result = await Permission.location.request();
    if (result != PermissionStatus.granted) {
      print("Quyền vị trí bị từ chối");
    }
  }
}