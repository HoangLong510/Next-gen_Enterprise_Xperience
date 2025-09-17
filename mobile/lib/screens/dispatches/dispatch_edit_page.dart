import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/document.dart';
import 'package:mobile/models/account.dart';
import 'package:mobile/models/enums/document_status.dart';
import 'package:mobile/models/enums/document_type.dart';
import 'package:mobile/services/document_service.dart';

class DispatchEditPage extends StatefulWidget {
  final int documentId;
  const DispatchEditPage({super.key, required this.documentId});

  @override
  State<DispatchEditPage> createState() => _DispatchEditPageState();
}

class _DispatchEditPageState extends State<DispatchEditPage> {
  bool _loading = true;
  bool _saving  = false;
  String? _error;

  DocumentModel? _doc;
  List<Account> _pmList = [];

  // common
  final _titleCtrl   = TextEditingController();
  final _contentCtrl = TextEditingController();

  // project
  final _projNameCtrl = TextEditingController();
  final _projDescCtrl = TextEditingController();
  DateTime? _projDeadline;
  int? _selectedPmId;

  // administrative
  final _fundNameCtrl    = TextEditingController();
  final _fundBalanceCtrl = TextEditingController();
  final _fundPurposeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
    _projNameCtrl.dispose();
    _projDescCtrl.dispose();
    _fundNameCtrl.dispose();
    _fundBalanceCtrl.dispose();
    _fundPurposeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final doc = await DocumentService.getById(widget.documentId);

      _titleCtrl.text   = doc.title;
      _contentCtrl.text = doc.content;

      if (doc.type == DocumentType.PROJECT) {
        _projNameCtrl.text = doc.projectName ?? '';
        _projDescCtrl.text = doc.projectDescription ?? '';
        // doc.projectDeadline là String? -> parse DateTime
        _projDeadline = _parseDeadline(doc.projectDeadline);
        _selectedPmId = doc.pmId;

        final list = await DocumentService.fetchPMAccounts();
        if (!mounted) return;
        setState(() => _pmList = list);
      } else if (doc.type == DocumentType.ADMINISTRATIVE) {
        _fundNameCtrl.text    = doc.fundName ?? '';
        _fundBalanceCtrl.text = (doc.fundBalance?.toString() ?? '');
        _fundPurposeCtrl.text = doc.fundPurpose ?? '';
      }

      setState(() => _doc = doc);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  DateTime? _parseDeadline(String? s) {
    if (s == null || s.isEmpty) return null;
    try {
      return DateFormat('yyyy-MM-dd').parse(s);
    } catch (_) {
      return DateTime.tryParse(s);
    }
  }


  Future<void> _pickDeadline() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _projDeadline ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => _projDeadline = picked);
  }


  Future<void> _save() async {
    final doc = _doc;
    if (doc == null) return;

    if (doc.status != DocumentStatus.NEW) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Only editable when status is NEW')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      if (doc.type == DocumentType.PROJECT) {
        final updated = await DocumentService.updateWithHistory(
          id: doc.id,
          title: _titleCtrl.text.trim(),
          content: _contentCtrl.text.trim(),
          projectName: _projNameCtrl.text.trim(),
          projectDescription: _projDescCtrl.text.trim(),
          projectDeadline: _projDeadline,
          pmId: _selectedPmId,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Updated successfully')),
        );
        Navigator.pop(context, updated);
      } else {
        final balance = double.tryParse(_fundBalanceCtrl.text.trim());
        final updated = await DocumentService.updateWithHistory(
          id: doc.id,
          title: _titleCtrl.text.trim(),
          content: _contentCtrl.text.trim(),
          fundName: _fundNameCtrl.text.trim(),
          fundBalance: balance,
          fundPurpose: _fundPurposeCtrl.text.trim(),
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Updated successfully')),
        );
        Navigator.pop(context, updated);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Update failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }


  Widget _pmDropdown() {
    final items = _pmList.map((a) {
      final full = '${a.firstName ?? ''} ${a.lastName ?? ''}'.trim();
      final label = full.isNotEmpty ? full : (a.username ?? 'PM');
      return DropdownMenuItem<int>(
        value: a.id,
        child: Text(label),
      );
    }).toList();

    return DropdownButtonFormField<int>(
      value: _selectedPmId,
      items: items,
      decoration: const InputDecoration(
        labelText: 'Project Manager',
        border: OutlineInputBorder(),
      ),
      onChanged: (v) => setState(() => _selectedPmId = v),
    );
  }


  @override
  Widget build(BuildContext context) {
    final doc = _doc;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit document'),
        actions: [
          if (!_loading && doc != null && doc.status == DocumentStatus.NEW)
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text('Error: $_error'))
          : doc == null
          ? const Center(child: Text('Not found'))
          : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Manager note (hint để edit)
          if ((doc.managerNote ?? '').isNotEmpty)
            Card(
              color: Colors.amber.shade50,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.note_alt, color: Colors.amber),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Manager note', style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text(doc.managerNote!),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),
          TextField(
            controller: _titleCtrl,
            decoration: const InputDecoration(
              labelText: 'Title',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _contentCtrl,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Content',
              border: OutlineInputBorder(),
            ),
          ),

          const SizedBox(height: 16),
          if (doc.type == DocumentType.PROJECT) ...[
            const Divider(),
            const Text('Project info', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _projNameCtrl,
              decoration: const InputDecoration(
                labelText: 'Project name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _projDescCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Project description',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDeadline,
                    icon: const Icon(Icons.date_range),
                    label: Text(
                        _projDeadline == null
                            ? 'Pick deadline'
                            : DateFormat('dd/MM/yyyy').format(_projDeadline!)
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _pmDropdown(),
          ],

          if (doc.type == DocumentType.ADMINISTRATIVE) ...[
            const Divider(),
            const Text('Fund info', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _fundNameCtrl,
              decoration: const InputDecoration(
                labelText: 'Fund name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _fundBalanceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Fund balance',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _fundPurposeCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Fund purpose',
                border: OutlineInputBorder(),
              ),
            ),
          ],

          const SizedBox(height: 24),
          if (doc.status != DocumentStatus.NEW)
            const Text(
              'This document cannot be edited because status is not NEW.',
              style: TextStyle(color: Colors.red),
            ),
        ],
      ),
    );
  }
}
