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

  static bool _isRefreshing = false;
  static final List<Completer<Response>> _waitingQueue = [];

  static void _initInterceptors() {
    _dio.interceptors.clear();

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
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

          if (originalRequest.extra['retry'] == true) {
            return handler.reject(error);
          }

          if (error.response?.statusCode == 401 &&
              refreshToken != null &&
              !originalRequest.path.contains('/auth/refresh-token') &&
              !originalRequest.path.contains('/auth/login')) {
            originalRequest.extra['retry'] = true;

            final completer = Completer<Response>();
            _waitingQueue.add(completer);

            if (!_isRefreshing) {
              _isRefreshing = true;
              try {
                final res = await _dio.get(
                  '/auth/refresh-token',
                  options: Options(
                    headers: {'Authorization': 'Bearer $refreshToken'},
                  ),
                );

                final newAccessToken = res.data['data']['accessToken'];
                final newRefreshToken = res.data['data']['refreshToken'];

                await prefs.setString('accessToken', newAccessToken);
                await prefs.setString('refreshToken', newRefreshToken);

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
                await _clearTokenAndRedirect();
                for (final completer in _waitingQueue) {
                  if (!completer.isCompleted) completer.completeError(e);
                }
              } finally {
                _waitingQueue.clear();
                _isRefreshing = false;
              }
            }

            return handler.resolve(await completer.future);
          }

          return handler.next(error);
        },
      ),
    );
  }

  static Future<void> _clearTokenAndRedirect() async {
    _authProvider?.logout();
  }

  static Dio get client => _dio;

  /// Build absolute URL từ đường dẫn BE trả về.
  /// - Chuẩn hoá backslash -> slash
  /// - Nếu đã là absolute (http/https/data/file/blob) -> trả nguyên
  /// - Nếu là relative (/uploads/... hoặc uploads/...) -> GHÉP origin **KÈM** context-path (vd /api)
  static String absoluteUrl(String? raw) {
    if (raw == null) return '';
    var s = raw.trim();
    if (s.isEmpty) return '';

    s = s.replaceAll('\\', '/');

    final lower = s.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('file:') ||
        lower.startsWith('blob:')) {
      return s;
    }

    final baseUri = Uri.parse(_dio.options.baseUrl); // ví dụ: http://10.0.2.2:4040/api
    final origin = '${baseUri.scheme}://${baseUri.host}${baseUri.hasPort ? ':${baseUri.port}' : ''}';
    final contextPath = baseUri.path; // "/api" hoặc ""

    // ensure leading slash
    final rel = s.startsWith('/') ? s : '/$s';

    // Nếu rel đã có contextPath (vd "/api/uploads/...") thì giữ nguyên
    final bool hasContextPath = contextPath.isNotEmpty && rel.startsWith(contextPath);

    final prefix = hasContextPath ? origin : (origin + contextPath);
    return '$prefix$rel';
  }

  /// Header Authorization (nếu có) – dùng cho Image.network khi ảnh nằm sau auth
  static Future<Map<String, String>?> authHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    if (token == null || token.isEmpty) return null;
    return {'Authorization': 'Bearer $token'};
  }
}
