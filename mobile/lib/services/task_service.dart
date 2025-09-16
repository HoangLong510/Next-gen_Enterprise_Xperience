import 'package:dio/dio.dart';

import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/project_task_model.dart';

class TaskService {
  // Dùng chung Dio đã cấu hình (baseUrl, interceptors, token...) từ ApiService
  static Dio get _dio => ApiService.client;

  /// Lấy danh sách task cho Kanban của 1 project
  /// BE: GET /tasks/kanban?projectId={id}
  /// Response: { data: [ TaskDto, ... ] }
  static Future<List<ProjectTaskModel>> getKanbanTasks(int projectId) async {
    final res = await _dio.get(
      '/tasks/kanban',
      queryParameters: {'projectId': projectId},
    );
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => ProjectTaskModel.fromJson(e)).toList();
  }

  /// Cập nhật trạng thái task
  /// BE: PUT /tasks/{id}/status
  /// Body: { "status": "IN_REVIEW" }
  static Future<void> updateStatus(int taskId, String toStatus) async {
    await _dio.put(
      '/tasks/$taskId/status',
      data: {'status': toStatus},
    );
  }

  /// Lấy danh sách evidence của task
  /// BE: GET /tasks/{id}/evidence
  /// Trả về List<dynamic> để FE dễ check .isNotEmpty
  static Future<List<dynamic>> listEvidence(int taskId) async {
    final res = await _dio.get('/tasks/$taskId/evidence');
    return (res.data['data'] as List?) ?? const [];
  }

  /// Upload nhiều evidence cho task
  /// BE: POST /tasks/{id}/evidence (multipart/form-data)
  /// Field name: "files" (BE @RequestPart("files") MultipartFile[] files)
  ///
  /// onSendProgress: callback (sent, total) -> để hiển thị % upload nếu cần
  static Future<void> uploadEvidence(
    int taskId,
    List<MultipartFile> files, {
    void Function(int sent, int total)? onSendProgress,
  }) async {
    if (files.isEmpty) return;

    final form = FormData();
    // Thêm từng file vào field "files"
    for (final f in files) {
      form.files.add(MapEntry('files', f));
    }

    await _dio.post(
      '/tasks/$taskId/evidence',
      data: form,
      options: Options(contentType: 'multipart/form-data'),
      onSendProgress: onSendProgress,
    );
  }

  /// Xoá toàn bộ evidence của 1 task
  /// BE: DELETE /tasks/{id}/evidence
  static Future<void> clearAllEvidence(int taskId) async {
    await _dio.delete('/tasks/$taskId/evidence');
  }

  /// Xoá 1 evidence theo id
  /// BE: DELETE /tasks/evidence/{evidenceId}
  static Future<void> deleteEvidence(int evidenceId) async {
    await _dio.delete('/tasks/evidence/$evidenceId');
  }
}
