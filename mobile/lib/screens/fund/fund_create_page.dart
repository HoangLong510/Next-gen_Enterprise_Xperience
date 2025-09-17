import 'package:flutter/material.dart';
import 'package:mobile/services/fund_service.dart';

class FundCreatePage extends StatefulWidget {
  const FundCreatePage({super.key});

  @override
  State<FundCreatePage> createState() => _FundCreatePageState();
}

class _FundCreatePageState extends State<FundCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _balanceCtrl = TextEditingController();
  final TextEditingController _purposeCtrl = TextEditingController();
  String _status = "ACTIVE";

  bool _loading = false;

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    final payload = {
      "name": _nameCtrl.text,
      "balance": double.tryParse(_balanceCtrl.text) ?? 0.0,
      "purpose": _purposeCtrl.text,
      "status": _status,
    };

    try {
      await FundService.createFund(payload);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Fund created successfully!")),
        );
        Navigator.pop(context, true); // go back & refresh list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error: $e")),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Create Fund")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: "Fund Name",
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    v == null || v.isEmpty ? "Name is required" : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _balanceCtrl,
                decoration: const InputDecoration(
                  labelText: "Initial Balance",
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (v) =>
                    v == null || v.isEmpty ? "Balance is required" : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _purposeCtrl,
                decoration: const InputDecoration(
                  labelText: "Purpose (optional)",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _status,
                items: const [
                  DropdownMenuItem(value: "ACTIVE", child: Text("Active")),
                  DropdownMenuItem(value: "INACTIVE", child: Text("Inactive")),
                ],
                onChanged: (val) => setState(() => _status = val ?? "ACTIVE"),
                decoration: const InputDecoration(
                  labelText: "Status",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loading ? null : _submit,
                icon: _loading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save),
                label: Text(_loading ? "Creating..." : "Create Fund"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
