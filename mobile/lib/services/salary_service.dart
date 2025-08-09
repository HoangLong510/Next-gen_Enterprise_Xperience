import 'package:mobile/models/account.dart';
import 'package:mobile/models/salary.dart';
import 'package:mobile/models/salary_summary.dart';
import 'package:mobile/services/api_service.dart';

class SalaryService {
  /// Lấy danh sách phiếu lương với bộ lọc
  static Future<List<Salary>> getSalaries({
    String? department,
    String? position,
    String? name,
  }) async {
    final response = await ApiService.client.get(
      '/accountant/salaries',
      queryParameters: {
        if (department != null) 'department': department,
        if (position != null) 'position': position,
        if (name != null) 'name': name,
      },
    );

    final data = response.data['data'] as List;
    return data.map((e) => Salary.fromJson(e)).toList();
  }

  /// Lấy chi tiết 1 phiếu lương theo ID
  static Future<Salary> getSalaryById(int id) async {
    final response = await ApiService.client.get('/accountant/salaries/$id');
    return Salary.fromJson(response.data['data']);
  }

  /// Tạo lương cho một nhân viên 
  static Future<String> createSalary({
    required String input,
    required int baseSalary,
  }) async {
    final response = await ApiService.client.post(
      '/accountant/salaries/create',
      queryParameters: {
        'input': input,
        'baseSalary': baseSalary,
      },
    );
    return response.data['message'];
  }

  /// Lấy danh sách tên phòng ban 
  static Future<List<String>> getDepartments() async {
    final response = await ApiService.client.get('/accountant/salaries/departments');
    final data = response.data['data'] as List;
    return data.cast<String>();
  }

  /// Lấy danh sách vai trò (Role)
  static Future<List<String>> getRoles() async {
    final response = await ApiService.client.get('/accountant/salaries/roles');
    final data = response.data['data'] as List;
    return data.cast<String>();
  }

  /// Tìm kiếm nhân viên theo email hoặc số điện thoại
  static Future<Account> getEmployeeBasicInfo(String input) async {
    final response = await ApiService.client.get(
      '/accountant/salaries/employee',
      queryParameters: {'input': input},
    );
    return Account.fromJson(response.data['data']);
  }

  /// Tạo bảng lương hàng loạt theo tháng, năm
  static Future<String> generateMonthlySalary({
    required int month,
    required int year,
  }) async {
    final response = await ApiService.client.post(
      '/accountant/salaries/generate',
      queryParameters: {'month': month, 'year': year},
    );
    return response.data['message'];
  }

  /// Lấy lịch sử lương theo mã nhân viên 
  static Future<List<Salary>> getSalaryHistoryByCode(String code) async {
    final response = await ApiService.client.get('/accountant/salaries/history/$code');
    final data = response.data['data'] as List;
    return data.map((e) => Salary.fromJson(e)).toList();
  }

 static Future<List<SalarySummary>> getSalarySummary({
  String? department,
  String? position,
  String? name,
}) async {
  final response = await ApiService.client.get(
    '/accountant/salaries/summary',
    queryParameters: {
      if (department != null) 'department': department,
      if (position != null) 'position': position,
      if (name != null) 'name': name,
    },
  );

  final raw = response.data;
  if (raw == null || raw['data'] == null || raw['data'] is! List) {
    throw Exception("Dữ liệu trả về không hợp lệ hoặc không có 'data'");
  }

  final data = raw['data'] as List;
  return data.map((e) => SalarySummary.fromJson(e)).toList();
}

}
