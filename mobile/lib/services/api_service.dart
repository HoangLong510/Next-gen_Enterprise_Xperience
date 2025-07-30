import 'dart:async';
import 'package:dio/dio.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Dio client duy nhất dùng toàn app
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: const String.fromEnvironment(
        'API_URL',
        defaultValue: 'http://10.0.2.2:4040/api',
      ),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  // Provider để xóa thông tin user khi logout
  static AuthProvider? _authProvider;

  // Đăng ký AuthProvider
  static void setAuthProvider(AuthProvider provider) {
    _authProvider = provider;
    _initInterceptors(); // Khởi tạo interceptor sau khi có provider
  }

  // Biến cờ để biết đang gọi refresh token hay không
  static bool _isRefreshing = false;

  // Danh sách các request đang chờ token mới
  static final List<Completer<Response>> _waitingQueue = [];

  // Hàm chính để cấu hình interceptor
  static void _initInterceptors() {
    _dio.interceptors.clear();

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Gắn access token vào header nếu có
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },

        onError: (DioException error, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final refreshToken = prefs.getString('refreshToken');
          final originalRequest = error.requestOptions;

          // Nếu request đã retry rồi thì không retry nữa
          if (originalRequest.extra['retry'] == true) {
            return handler.reject(error);
          }

          // Nếu lỗi là 401 và đủ điều kiện để refresh
          if (error.response?.statusCode == 401 &&
              refreshToken != null &&
              !originalRequest.path.contains('/auth/refresh-token') &&
              !originalRequest.path.contains('/auth/login')) {
            // Đánh dấu request đã retry
            originalRequest.extra['retry'] = true;

            final completer = Completer<Response>();
            _waitingQueue.add(completer);

            // Nếu chưa refresh thì bắt đầu refresh
            if (!_isRefreshing) {
              _isRefreshing = true;
              try {
                print("Attempting to refresh token...");
                final res = await _dio.get(
                  '/auth/refresh-token',
                  options: Options(
                    headers: {'Authorization': 'Bearer $refreshToken'},
                  ),
                );

                final newAccessToken = res.data['data']['accessToken'];
                final newRefreshToken = res.data['data']['refreshToken'];

                // Lưu lại token mới
                await prefs.setString('accessToken', newAccessToken);
                await prefs.setString('refreshToken', newRefreshToken);

                print("Token refreshed. Retrying queued requests...");

                // Gửi lại tất cả các request đang chờ
                for (final completer in _waitingQueue) {
                  try {
                    final clone = Options(
                      method: originalRequest.method,
                      headers: {
                        ...originalRequest.headers,
                        'Authorization': 'Bearer $newAccessToken',
                      },
                    );
                    final response = await _dio.request(
                      originalRequest.path,
                      data: originalRequest.data,
                      queryParameters: originalRequest.queryParameters,
                      options: clone,
                    );
                    if (!completer.isCompleted) completer.complete(response);
                  } catch (e) {
                    if (!completer.isCompleted) completer.completeError(e);
                  }
                }
              } catch (e) {
                // Refresh thất bại → logout toàn bộ
                await _clearTokenAndRedirect();
                for (final completer in _waitingQueue) {
                  if (!completer.isCompleted) completer.completeError(e);
                }
              } finally {
                _waitingQueue.clear();
                _isRefreshing = false;
              }
            } else {
              print("Waiting for token refresh to complete...");
            }

            // Đợi request hiện tại được xử lý lại
            return handler.resolve(await completer.future);
          }

          // Nếu không phải lỗi liên quan đến token thì trả lỗi như bình thường
          return handler.next(error);
        },
      ),
    );
  }

  // Xóa token và gọi logout provider
  static Future<void> _clearTokenAndRedirect() async {
    _authProvider?.logout();
  }

  // Public getter cho Dio client
  static Dio get client => _dio;
}
