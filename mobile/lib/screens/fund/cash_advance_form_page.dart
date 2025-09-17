import 'package:flutter/material.dart';
import 'package:signature/signature.dart';

class CashAdvanceFormPage extends StatefulWidget {
  final bool withTask;

  const CashAdvanceFormPage({
    super.key,
    this.withTask = true,
  });

  @override
  State<CashAdvanceFormPage> createState() => _CashAdvanceFormPageState();
}

class _CashAdvanceFormPageState extends State<CashAdvanceFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  final _recipientCtrl = TextEditingController(
    text: "Board of Directors of Next-Gen Enterprise Experience Company",
  );

  DateTime? _deadline;
  String? _selectedTask;
  bool _submitting = false;

  // chữ ký
  final SignatureController _sigController = SignatureController(
    penStrokeWidth: 2,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_deadline == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please choose deadline")),
      );
      return;
    }
    if (_sigController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please sign before submitting")),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final amount = double.parse(_amountCtrl.text);
      final reason = _reasonCtrl.text.trim();

      // xuất chữ ký base64/png
      final sigBytes = await _sigController.toPngBytes();
      if (sigBytes == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Could not get signature")),
        );
        return;
      }

      // TODO: gọi API createCashAdvance (qua CashAdvanceService)
      debugPrint("Task: $_selectedTask");
      debugPrint("Amount: $amount");
      debugPrint("Reason: $reason");
      debugPrint("Deadline: $_deadline");
      debugPrint("Recipient: ${_recipientCtrl.text}");
      debugPrint("Signature bytes length: ${sigBytes.length}");

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Advance request sent successfully")),
      );

      Navigator.pop(context, true);
    } catch (e) {
      debugPrint("Error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Error sending request")),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    _recipientCtrl.dispose();
    _sigController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Cash Advance Request (Form 03-TT)")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              // Recipient
              TextFormField(
                controller: _recipientCtrl,
                decoration: const InputDecoration(labelText: "Dear"),
              ),
              const SizedBox(height: 16),

              // Task (optional)
              if (widget.withTask)
                DropdownButtonFormField<String>(
                  value: _selectedTask,
                  items: ["Task A", "Task B", "Task C"]
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedTask = v),
                  decoration: const InputDecoration(
                    labelText: "Select Task to advance (optional)",
                  ),
                ),
              if (widget.withTask) const SizedBox(height: 16),

              // Amount
              TextFormField(
                controller: _amountCtrl,
                decoration: const InputDecoration(
                  labelText: "Advance request (VND)",
                ),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return "Enter amount";
                  final num = double.tryParse(v);
                  if (num == null || num <= 0) return "Amount must be > 0";
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Reason
              TextFormField(
                controller: _reasonCtrl,
                decoration: const InputDecoration(labelText: "Reason"),
                maxLines: 3,
                validator: (v) =>
                    (v == null || v.isEmpty) ? "Enter reason" : null,
              ),
              const SizedBox(height: 16),

              // Deadline
              ListTile(
                title: Text(_deadline == null
                    ? "Select payment term"
                    : "Payment term: ${_deadline!.toLocal().toString().split(' ')[0]}"),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now().add(const Duration(days: 1)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => _deadline = picked);
                },
              ),
              const SizedBox(height: 16),

              // Signature
              Text("Signature", style: Theme.of(context).textTheme.titleMedium),
              Container(
                decoration:
                    BoxDecoration(border: Border.all(color: Colors.grey)),
                height: 160,
                child: Signature(controller: _sigController),
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () => _sigController.clear(),
                    child: const Text("Clear"),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const CircularProgressIndicator()
                    : const Text("Send to Accountant"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
