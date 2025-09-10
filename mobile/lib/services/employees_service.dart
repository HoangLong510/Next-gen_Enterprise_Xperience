import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/services/api_service.dart';

class EmployeesService {
  static final Dio client = Dio(
    BaseOptions(
      baseUrl: 'YOUR_API_ENDPOINT',
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 3),
    ),
  );

  static Future<Map<String, dynamic>> changeAvatarApi(XFile file) async {
    try {
      String fileName = file.path.split('/').last;
      FormData formData = FormData.fromMap({
        "file": await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await ApiService.client.post(
        "/employees/change-avatar",
        data: formData,
      );

      return response.data;
    } on DioError catch (e) {
      if (e.response != null) return e.response!.data;
      return {"status": 500, "message": "server-is-busy"};
    } catch (e) {
      return {"status": 500, "message": "server-is-busy"};
    }
  }
}
