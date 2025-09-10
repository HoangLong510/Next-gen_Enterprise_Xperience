import 'package:flutter/material.dart';
import 'package:mobile/models/enums/payment_method.dart';
import 'package:mobile/models/enums/salary_status.dart';
import 'package:mobile/models/salary.dart';
import 'package:mobile/services/salary_service.dart';

class SalaryDetailPage extends StatelessWidget {
  final int salaryId;
  const SalaryDetailPage({super.key, required this.salaryId});

  Widget _info(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label), Text(value)],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết phiếu lương')),
      body: FutureBuilder<Salary>(
        future: SalaryService.getSalaryById(salaryId),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final s = snapshot.data!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${s.employee.lastName ?? ''} ${s.employee.firstName ?? ''}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Tháng ${s.month}/${s.year}'),
                const Divider(height: 24),
                _info("Lương cơ bản", '${s.baseSalary} đ'),
                _info("Ngày công", '${s.workingDays}'),
                _info("Lương thực tế", '${s.actualSalary} đ'),
                _info("Phụ cấp ăn trưa", '${s.allowanceLunch} đ'),
                _info("Phụ cấp điện thoại", '${s.allowancePhone} đ'),
                _info("Phụ cấp trách nhiệm", '${s.allowanceResponsibility} đ'),
                _info("Tổng lương", '${s.totalSalary} đ'),
                _info("Trừ BHXH", '${s.deductionBhxh} đ'),
                _info("Trừ BHYT", '${s.deductionBhyt} đ'),
                _info("Trừ BHTN", '${s.deductionBhtn} đ'),
                const Divider(height: 24),
                _info("Thực lĩnh", '${s.total} đ'),
                _info("Trạng thái", s.status.label),
                _info("Hình thức trả", s.paymentMethod?.label ?? '---'),
                const SizedBox(height: 16),
                if (s.fileUrl != null)
                  TextButton(
                    onPressed: () {
                      // TODO: mở URL hoặc tải file
                    },
                    child: const Text("Tải phiếu lương PDF"),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
