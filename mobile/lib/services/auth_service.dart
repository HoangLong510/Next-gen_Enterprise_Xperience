import 'package:dio/dio.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/services/api_service.dart';

class AuthService {
  static Future<Account?> fetchAccountDataApi() async {
    try {
      final response = await ApiService.client.get("/auth/fetch-data");
      if (response.statusCode == 200) {
        final data = response.data['data'];
        return Account.fromJson(data);
      }
    } catch (e) {
      print('Fetch user error: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>> loginApi(
    String username,
    String password,
  ) async {
    try {
      final response = await ApiService.client.post(
        "/auth/login",
        data: {"username": username, "password": password},
        options: Options(headers: {"Content-Type": "application/json"}),
      );
      return response.data;
    } catch (e) {
      if (e is DioError && e.response != null) return e.response!.data;
      return {"status": 500, "message": "server-is-busy"};
    }
  }

  static Future<void> logoutApi() async {
    try {
      await ApiService.client.get("/auth/logout");
    } catch (e) {
      print('Logout error: $e');
    }
  }
}
