
// lib/services/project_service.dart
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/project_model.dart';

class ProjectService {
  /// ADMIN/MANAGER/PM: lấy danh sách project theo quyền.
  /// EMP/HOD: không dùng hàm này ở màn list, thay vào đó dùng getKanbanVisible().
  static Future<List<ProjectModel>> getAllVisible() async {
    final res = await ApiService.client.get('/projects');
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => ProjectModel.fromJson(e)).toList();
  }

  /// EMP/HOD: Lấy danh sách project mà user hiện tại có ít nhất 1 task được assign.
  /// BE endpoint: GET /projects/kanban
  static Future<List<ProjectModel>> getKanbanVisible() async {
    final res = await ApiService.client.get('/projects/kanban');
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => ProjectModel.fromJson(e)).toList();
  }

  /// Tìm kiếm dự án (BE đã lọc theo vai trò người dùng).
  static Future<List<ProjectModel>> search(String keyword) async {
    final res = await ApiService.client.get(
      '/projects/search',
      queryParameters: {'keyword': keyword},
    );
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => ProjectModel.fromJson(e)).toList();
  }

  /// Lọc dự án (BE đã lọc theo vai trò người dùng).
  static Future<List<ProjectModel>> filter({String? status, String? priority}) async {
    final res = await ApiService.client.get(
      '/projects/filter',
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status,
        if (priority != null && priority.isNotEmpty) 'priority': priority,
      },
    );
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => ProjectModel.fromJson(e)).toList();
  }

  /// Chi tiết 1 dự án.
  static Future<ProjectModel> getDetail(int id) async {
    final res = await ApiService.client.get('/projects/$id');
    return ProjectModel.fromJson(res.data['data']);
  }
}