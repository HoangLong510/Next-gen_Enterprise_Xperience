import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/document.dart';
import 'package:mobile/models/enums/document_status.dart';
import 'package:mobile/models/enums/document_type.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/services/document_service.dart';

class DispatchesListPage extends StatefulWidget {
  const DispatchesListPage({super.key});

  @override
  State<DispatchesListPage> createState() => _DispatchesListPageState();
}

class _DispatchesListPageState extends State<DispatchesListPage> {
  List<DocumentModel> documents = [];
  bool isLoading = false;
  String? statusFilter;
  String? typeFilter;
  String? searchTerm;
  int currentPage = 1;
  int totalPages = 1;

  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    fetchDocuments();
  }

  Future<void> fetchDocuments() async {
  setState(() => isLoading = true);
  try {
    final role = context.read<AuthProvider>().account?.role;

    if (role == "ADMIN" || role == "MANAGER" || role == "SECRETARY") {
      final (docs, total) = await DocumentService.getAllDocuments(
        page: currentPage,
        statusFilter: statusFilter,
        typeFilter: typeFilter,
        searchTerm: searchTerm,
      );
      documents = docs;
      totalPages = total;
    } else {
      documents = await DocumentService.getMyDocuments(
        page: currentPage,
        statusFilter: statusFilter,
        typeFilter: typeFilter,
        searchTerm: searchTerm,
      );
      totalPages = 1;
    }
  } catch (e) {
    print("Lỗi khi lấy danh sách công văn: $e");
  }
  setState(() => isLoading = false);
}

  Widget buildFilterBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            SizedBox(
              width: 250,
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  labelText: 'Tìm kiếm',
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: () {
                      searchTerm = _searchController.text.trim();
                      currentPage = 1;
                      fetchDocuments();
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            DropdownButton<String?>(
              hint: const Text("Trạng thái"),
              value: statusFilter,
              items: [null, ...DocumentStatus.values.map((e) => e.name)].map((
                value,
              ) {
                return DropdownMenuItem<String?>(
                  value: value,
                  child: Text(value ?? 'Tất cả'),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  statusFilter = value;
                  currentPage = 1;
                });
                fetchDocuments();
              },
            ),
            const SizedBox(width: 8),
            DropdownButton<String?>(
              hint: const Text("Loại"),
              value: typeFilter,
              items: [null, ...DocumentType.values.map((e) => e.name)].map((
                value,
              ) {
                return DropdownMenuItem<String?>(
                  value: value,
                  child: Text(value ?? 'Tất cả'),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  typeFilter = value;
                  currentPage = 1;
                });
                fetchDocuments();
              },
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: () async {
                final result = await Navigator.pushNamed(
                  context,
                  "/management/documents/create",
                );
                if (result == true) {
                  currentPage = 1;
                  fetchDocuments();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text("Tạo công văn"),
            ),
          ],
        ),
      ),
    );
  }

  Widget buildTable() {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (documents.isEmpty) {
      return const Center(child: Text("Không có công văn nào."));
    }
    return DataTable(
      showCheckboxColumn: false, // <<-- Thêm dòng này
      columns: const [
        DataColumn(label: Text("Mã số")),
        DataColumn(label: Text("Tiêu đề")),
        DataColumn(label: Text("Loại")),
        DataColumn(label: Text("Trạng thái")),
        DataColumn(label: Text("Ngày tạo")),
      ],
      rows: documents.map((doc) {
        return DataRow(
          onSelectChanged: (_) async {
            final result = await Navigator.pushNamed(
              context,
              "/management/documents/${doc.id}",
              arguments: doc.id,
            );
            if (result == 'signed') {
              fetchDocuments(); // reload lại sau khi ký
            }
          },
          cells: [
            DataCell(Text(doc.code)),
            DataCell(Text(doc.title)),
            DataCell(Text(doc.type.displayName)),
            DataCell(Text(doc.status.displayName)),
            DataCell(Text(DateFormat('dd/MM/yyyy').format(doc.createdAt))),
          ],
        );
      }).toList(),
    );
  }

  Widget buildPagination() {
    if (totalPages <= 1) return const SizedBox();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Wrap(
        spacing: 8,
        children: List.generate(totalPages, (index) {
          final pageNum = index + 1;
          return ElevatedButton(
            onPressed: () {
              setState(() {
                currentPage = pageNum;
              });
              fetchDocuments();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: pageNum == currentPage
                  ? Colors.blue
                  : Colors.grey[300],
              foregroundColor: pageNum == currentPage
                  ? Colors.white
                  : Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            child: Text('$pageNum'),
          );
        }),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Danh sách công văn")),
      body: Column(
        children: [
          buildFilterBar(),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: buildTable(),
                ),
                buildPagination(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
