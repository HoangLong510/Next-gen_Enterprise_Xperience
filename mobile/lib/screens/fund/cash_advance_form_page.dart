import 'package:flutter/material.dart';
import '../../services/cash_advance_service.dart';

class CashAdvanceFormPage extends StatefulWidget {
  final String token;
  const CashAdvanceFormPage({super.key, required this.token});

  @override
  State<CashAdvanceFormPage> createState() => _CashAdvanceFormPageState();
}

class _CashAdvanceFormPageState extends State<CashAdvanceFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await CashAdvanceService.createCashAdvance(
      widget.token,
      1, // TODO: cho chọn taskId
      double.parse(_amountCtrl.text),
      _reasonCtrl.text,
    );
    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("New Cash Advance")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _amountCtrl,
                decoration: const InputDecoration(labelText: "Amount"),
                keyboardType: TextInputType.number,
                validator: (v) => v == null || v.isEmpty ? "Enter amount" : null,
              ),
              TextFormField(
                controller: _reasonCtrl,
                decoration: const InputDecoration(labelText: "Reason"),
              ),
              const SizedBox(height: 20),
              ElevatedButton(onPressed: _submit, child: const Text("Submit")),
            ],
          ),
        ),
      ),
    );
  }
}
