// lib/services/phase_service.dart
import 'package:mobile/services/api_service.dart';
import 'package:mobile/models/phase_model.dart';

class PhaseService {
  /// BE đã lọc theo quyền:
  /// - ADMIN/MANAGER/PM: thấy đầy đủ
  /// - EMP/HOD: chỉ thấy tasks assign cho chính họ
  static Future<List<PhaseModel>> getPhasesWithTasksByProject(int projectId) async {
    final res = await ApiService.client.get('/phases/project/$projectId/with-tasks');
    final List list = res.data['data'] as List? ?? const [];
    return list.map((e) => PhaseModel.fromJson(e)).toList();
  }
}