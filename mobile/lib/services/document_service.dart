import 'package:dio/dio.dart';
import 'package:mobile/models/api_response.dart';
import 'package:mobile/models/document.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/account.dart';

class DocumentService {
  // Lấy danh sách công văn (cho ADMIN, MANAGER, SECRETARY)
  static Future<(List<DocumentModel>, int)> getAllDocuments({
    int page = 1,
    int pageSize = 10,
    String? statusFilter,
    String? typeFilter,
    String? searchTerm,
  }) async {
    final res = await ApiService.client.post(
      '/documents/get-documents-page',
      data: {
        "pageNumber": page,
        "pageSize": pageSize,
        "statusFilter": statusFilter,
        "typeFilter": typeFilter,
        "searchTerm": searchTerm,
        "sortBy": "desc",
      },
    );

    final list = res.data['data']['documents'] as List;
    final totalPage = res.data['data']['totalPage'] as int;
    final models = list.map((e) => DocumentModel.fromJson(e)).toList();

    return (models, totalPage);
  }

  // Lấy danh sách công văn của mình (PM, ACCOUNTANT, HOD)
  static Future<List<DocumentModel>> getMyDocuments({
    int page = 1,
    int pageSize = 10,
    String? statusFilter,
    String? typeFilter,
    String? searchTerm,
  }) async {
    final res = await ApiService.client.post(
      '/documents/my/get-documents-page',
      data: {
        "pageNumber": page,
        "pageSize": pageSize,
        "statusFilter": statusFilter,
        "typeFilter": typeFilter,
        "searchTerm": searchTerm,
        "sortBy": "desc",
      },
    );
    final list = res.data['data']['documents'] as List;
    return list.map((e) => DocumentModel.fromJson(e)).toList();
  }

  // Lấy chi tiết công văn
  static Future<DocumentModel> getById(int id) async {
    final res = await ApiService.client.get('/documents/$id');
    return DocumentModel.fromJson(res.data['data']);
  }

  // Ký công văn (chỉ MANAGER)
  static Future<ApiResponse> signDocument(int id, String signature) async {
    final res = await ApiService.client.post(
      '/documents/$id/sign',
      data: {'signature': signature},
    );
    return ApiResponse.fromJson(res.data);
  }

  // Tạo công văn
  static Future<DocumentModel> createDocument(Map<String, dynamic> body) async {
    final res = await ApiService.client.post('/documents/create', data: body);
    return DocumentModel.fromJson(res.data['data']);
  }

  // Lấy HTML preview
  static Future<String> getPreviewHtml(int id) async {
    final res = await ApiService.client.get('/documents/$id/preview');
    return res.data['data'] as String;
  }

  // Tải file công văn
  static Future<Response<ResponseBody>> downloadFile(int id) async {
    final res = await ApiService.client.get<ResponseBody>(
      '/documents/download/$id',
      options: Options(responseType: ResponseType.bytes),
    );
    return res;
  }

  static Future<List<Account>> fetchPMAccounts() async {
    final res = await ApiService.client.get('/accounts/roles/PM');
    final List list = res.data['data'];
    return list.map((e) => Account.fromJson(e)).toList();
  }

  static Future<ApiResponse> addManagerNote(int id, String note) async {
    final res = await ApiService.client.put(
      '/documents/$id/note',
      data: {'note': note},
    );
    return ApiResponse.fromJson(res.data);
  }
}
