import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/salary_summary.dart';
import 'package:mobile/services/salary_service.dart';

class SalarySummaryPage extends StatefulWidget {
  const SalarySummaryPage({super.key});

  @override
  State<SalarySummaryPage> createState() => _SalarySummaryPageState();
}

class _SalarySummaryPageState extends State<SalarySummaryPage> {
  List<SalarySummary> _summaries = [];
  bool _loading = true;

  List<String> _departments = [];
  List<String> _roles = [];

  String? departmentFilter;
  String? roleFilter;
  String? nameFilter;

  final _nameController = TextEditingController();
  final currencyFormatter = NumberFormat('#,###', 'en_US');

  @override
  void initState() {
    super.initState();
    _loadFilters();
    _loadData();
  }

  Future<void> _loadFilters() async {
    try {
      final deps = await SalaryService.getDepartments();
      final roles = await SalaryService.getRoles();

      setState(() {
        _departments = deps;
        _roles = roles;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load filter options: $e")),
      );
    }
  }

  Future<void> _loadData() async {
    try {
      setState(() => _loading = true);
      final summaries = await SalaryService.getSalarySummary(
        department: departmentFilter,
        position: roleFilter,
        name: nameFilter,
      );
      setState(() {
        _summaries = summaries;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load summaries: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  void _onSearch() {
    nameFilter = _nameController.text.trim().isEmpty
        ? null
        : _nameController.text.trim();
    _loadData();
  }

  void _clearFilters() {
    setState(() {
      _nameController.clear();
      departmentFilter = null;
      roleFilter = null;
    });
    _loadData();
  }

  Widget _buildSummaryItem(SalarySummary s) {
    final totalFormatted = currencyFormatter.format(s.total);
    final baseFormatted = currencyFormatter.format(s.baseSalary);

    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Employee Code: ${s.code} - ${s.role}",
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            if (s.department != null) Text("Department: ${s.department}"),
            const SizedBox(height: 6),
            Text("Month: ${s.month}/${s.year}"),
            const SizedBox(height: 6),
            Text("Base Salary: $baseFormatted ₫"),
            const SizedBox(height: 6),
            Text("Total Salary: $totalFormatted ₫"),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  s.status.toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterDrawer() {
    return Drawer(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              const Text(
                "Filters",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Divider(),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Search by name',
                  prefixIcon: Icon(Icons.search),
                ),
                onSubmitted: (_) => _onSearch(),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: departmentFilter,
                hint: const Text("Department"),
                items: _departments
                    .map((dep) => DropdownMenuItem(
                          value: dep,
                          child: Text(dep),
                        ))
                    .toList(),
                onChanged: (val) {
                  setState(() {
                    departmentFilter = val;
                  });
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: roleFilter,
                hint: const Text("Role"),
                items: _roles
                    .map((r) => DropdownMenuItem(
                          value: r,
                          child: Text(r),
                        ))
                    .toList(),
                onChanged: (val) {
                  setState(() {
                    roleFilter = val;
                  });
                },
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Close drawer
                  _onSearch();
                },
                child: const Text('Filter'),
              ),
              TextButton(
                onPressed: () {
                  _clearFilters();
                  Navigator.of(context).pop();
                },
                child: const Text("Clear Filters"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salary Summary'),
        actions: [
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.filter_alt_outlined),
              onPressed: () => Scaffold.of(context).openEndDrawer(),
            ),
          ),
        ],
      ),
      endDrawer: _buildFilterDrawer(),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadData,
                child: _summaries.isEmpty
                    ? const Center(child: Text('No salary summaries available.'))
                    : ListView.builder(
                        itemCount: _summaries.length,
                        itemBuilder: (_, i) =>
                            _buildSummaryItem(_summaries[i]),
                      ),
              ),
      ),
    );
  }
}
