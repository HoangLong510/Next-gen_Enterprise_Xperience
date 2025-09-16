import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/cash_advance.dart';

class CashAdvanceService {
  static const String baseUrl = "http://localhost:8080/cash-advances";

  static Future<List<CashAdvance>> getMyCashAdvances(String token) async {
    final res = await http.get(
      Uri.parse("$baseUrl/my"),
      headers: {"Authorization": "Bearer $token"},
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body)['data'] as List;
      return data.map((e) => CashAdvance.fromJson(e)).toList();
    } else {
      throw Exception("Failed to load cash advances");
    }
  }

  static Future<void> createCashAdvance(
      String token, int taskId, double amount, String reason) async {
    final req = http.MultipartRequest("POST", Uri.parse("$baseUrl/simple"));
    req.headers["Authorization"] = "Bearer $token";
    req.fields["taskId"] = taskId.toString();
    req.fields["amount"] = amount.toString();
    req.fields["reason"] = reason;

    final res = await req.send();
    if (res.statusCode != 200) {
      throw Exception("Create cash advance failed");
    }
  }
}
