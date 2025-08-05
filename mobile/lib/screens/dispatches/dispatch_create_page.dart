import 'package:flutter/material.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/services/document_service.dart';
import 'package:mobile/models/enums/document_type.dart';

class DispatchCreatePage extends StatefulWidget {
  const DispatchCreatePage({super.key});

  @override
  State<DispatchCreatePage> createState() => _DispatchCreatePageState();
}

class _DispatchCreatePageState extends State<DispatchCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();

  // Project fields
  final TextEditingController _projectNameController = TextEditingController();
  final TextEditingController _projectDescriptionController = TextEditingController();
  final TextEditingController _projectDeadlineController = TextEditingController();
  String? _projectPriority;
  Account? _selectedPM;

  // Admin fields
  final TextEditingController _fundNameController = TextEditingController();
  final TextEditingController _fundBalanceController = TextEditingController();
  final TextEditingController _fundPurposeController = TextEditingController();

  DocumentType? _selectedType;
  List<Account> pmList = [];

  @override
  void initState() {
    super.initState();
    loadPMs();
  }

  Future<void> loadPMs() async {
    try {
      final list = await DocumentService.fetchPMAccounts();
      setState(() => pmList = list);
    } catch (e) {
      print("Error loading PMs: $e");
    }
  }

  void handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final body = {
      'title': _titleController.text,
      'content': _contentController.text,
      'type': _selectedType?.name,
      'pmId': _selectedType == DocumentType.PROJECT ? _selectedPM?.id : null,
      'receiverId': _selectedType == DocumentType.PROJECT ? _selectedPM?.id : null,
      'projectName': _selectedType == DocumentType.PROJECT ? _projectNameController.text : null,
      'projectDescription': _selectedType == DocumentType.PROJECT ? _projectDescriptionController.text : null,
      'projectDeadline': _selectedType == DocumentType.PROJECT ? _projectDeadlineController.text : null,
      'projectPriority': _selectedType == DocumentType.PROJECT ? _projectPriority : null,
      'fundName': _selectedType == DocumentType.ADMINISTRATIVE ? _fundNameController.text : null,
      'fundBalance': _selectedType == DocumentType.ADMINISTRATIVE ? double.tryParse(_fundBalanceController.text) : null,
      'fundPurpose': _selectedType == DocumentType.ADMINISTRATIVE ? _fundPurposeController.text : null,
    };

    try {
      await DocumentService.createDocument(body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      print("Create failed: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Tạo công văn mới")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: "Tiêu đề"),
                validator: (value) => value == null || value.isEmpty ? 'Vui lòng nhập tiêu đề' : null,
              ),
              TextFormField(
                controller: _contentController,
                decoration: const InputDecoration(labelText: "Nội dung"),
                maxLines: 3,
                validator: (value) => value == null || value.isEmpty ? 'Vui lòng nhập nội dung' : null,
              ),
              DropdownButtonFormField<DocumentType>(
                decoration: const InputDecoration(labelText: "Loại công văn"),
                value: _selectedType,
                items: DocumentType.values.map((e) => DropdownMenuItem(value: e, child: Text(e.displayName))).toList(),
                onChanged: (val) => setState(() => _selectedType = val),
                validator: (value) => value == null ? 'Chọn loại công văn' : null,
              ),
              if (_selectedType == DocumentType.PROJECT) ...[
                DropdownButtonFormField<Account>(
                  decoration: const InputDecoration(labelText: "Chọn PM"),
                  value: _selectedPM,
                  items: pmList.map((pm) => DropdownMenuItem(value: pm, child: Text(pm.username ?? "(No name)"))).toList(),
                  onChanged: (val) => setState(() => _selectedPM = val),
                  validator: (val) => val == null ? 'Chọn PM' : null,
                ),
                TextFormField(
                  controller: _projectNameController,
                  decoration: const InputDecoration(labelText: "Tên dự án"),
                  validator: (val) => val == null || val.isEmpty ? 'Nhập tên dự án' : null,
                ),
                TextFormField(
                  controller: _projectDeadlineController,
                  decoration: const InputDecoration(labelText: "Deadline (yyyy-mm-dd)"),
                  validator: (val) => val == null || val.isEmpty ? 'Nhập deadline' : null,
                ),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: "Mức độ ưu tiên"),
                  value: _projectPriority,
                  items: ["LOW", "MEDIUM", "HIGH"].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                  onChanged: (val) => setState(() => _projectPriority = val),
                  validator: (val) => val == null ? 'Chọn mức độ ưu tiên' : null,
                ),
                TextFormField(
                  controller: _projectDescriptionController,
                  decoration: const InputDecoration(labelText: "Mô tả dự án"),
                  maxLines: 2,
                  validator: (val) => val == null || val.isEmpty ? 'Nhập mô tả' : null,
                ),
              ],
              if (_selectedType == DocumentType.ADMINISTRATIVE) ...[
                TextFormField(
                  controller: _fundNameController,
                  decoration: const InputDecoration(labelText: "Tên quỹ"),
                  validator: (val) => val == null || val.isEmpty ? 'Nhập tên quỹ' : null,
                ),
                TextFormField(
                  controller: _fundBalanceController,
                  decoration: const InputDecoration(labelText: "Số tiền"),
                  keyboardType: TextInputType.number,
                  validator: (val) => val == null || val.isEmpty ? 'Nhập số tiền' : null,
                ),
                TextFormField(
                  controller: _fundPurposeController,
                  decoration: const InputDecoration(labelText: "Mục đích"),
                  validator: (val) => val == null || val.isEmpty ? 'Nhập mục đích' : null,
                ),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: handleSubmit,
                child: const Text("Tạo công văn"),
              )
            ],
          ),
        ),
      ),
    );
  }
}
