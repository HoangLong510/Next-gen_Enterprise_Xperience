import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/attendance_model.dart';
import 'package:mobile/models/enums/attendance_status.dart';
import 'package:mobile/services/attendance_service.dart';
import 'package:mobile/screens/attendance/attendance_details_page.dart';

class AttendanceListPage extends StatefulWidget {
  const AttendanceListPage({Key? key}) : super(key: key);

  @override
  State<AttendanceListPage> createState() => _AttendanceListPageState();
}

class _AttendanceListPageState extends State<AttendanceListPage> {
  List<Attendance> attendances = [];
  bool isLoading = false;

  String? statusFilter;
  String? searchTerm;
  int currentPage = 1;
  int totalPages = 1;
  DateTime? fromDate;
  DateTime? toDate;

  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    fetchAttendances();
  }

  Future<void> _goToDetail(int id) async {
    await Navigator.pushNamed(context, "/attendance/detail", arguments: id);
    await fetchAttendances();
  }

  Future<void> fetchAttendances() async {
    setState(() => isLoading = true);

    try {

      final (list, total) = await AttendanceService.getMyAttendancePage(
        page: currentPage,
        statusFilter: statusFilter,
        searchTerm: searchTerm,
        sortBy: "desc",
        fromDate: fromDate,
        toDate: toDate,
      );
      setState(() {
        attendances = list;
        totalPages = total;
      });
    } catch (e) {
      debugPrint("Lỗi khi lấy danh sách chấm công: $e");
    }

    setState(() => isLoading = false);
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: fromDate != null && toDate != null
          ? DateTimeRange(start: fromDate!, end: toDate!)
          : null,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      setState(() {
        fromDate = picked.start;
        toDate = picked.end;
        currentPage = 1;
      });
      fetchAttendances();
    }
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
                      fetchAttendances();
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            DropdownButton<String?>(
              hint: const Text("Trạng thái"),
              value: statusFilter,
              items: [null, ...AttendanceStatus.values.map((e) => e.name)].map((value) {
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
                fetchAttendances();
              },
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.date_range),
              label: Text(
                fromDate != null && toDate != null
                    ? '${DateFormat('dd/MM/yyyy').format(fromDate!)} - ${DateFormat('dd/MM/yyyy').format(toDate!)}'
                    : 'Chọn khoảng ngày',
              ),
              onPressed: () => _selectDateRange(context),
            ),
            if (fromDate != null && toDate != null)
              IconButton(
                icon: const Icon(Icons.clear),
                tooltip: 'Xoá lọc ngày',
                onPressed: () {
                  setState(() {
                    fromDate = null;
                    toDate = null;
                    currentPage = 1;
                  });
                  fetchAttendances();
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget buildTable() {
    if (isLoading) return const Center(child: CircularProgressIndicator());
    if (attendances.isEmpty) return const Center(child: Text("Không có dữ liệu chấm công"));

    return DataTable(
      showCheckboxColumn: false,
      columns: const [
        DataColumn(label: Text('ID')),
        DataColumn(label: Text('Check-in')),
        DataColumn(label: Text('Check-out')),
        DataColumn(label: Text('Trạng thái')),
        DataColumn(label: Text('Ghi chú')),
      ],
      rows: attendances.map((att) {
        final id = att.id;
        return DataRow(
          onSelectChanged: (_) => _goToDetail(id), // bấm cả hàng cũng đi
          cells: [
            DataCell(Text(id.toString()), onTap: () => _goToDetail(id)),
            DataCell(
              Text(att.checkInTime != null
                  ? DateFormat('dd/MM/yyyy HH:mm').format(att.checkInTime!)
                  : '-'),
              onTap: () => _goToDetail(id),
            ),
            DataCell(
              Text(att.checkOutTime != null
                  ? DateFormat('dd/MM/yyyy HH:mm').format(att.checkOutTime!)
                  : '-'),
              onTap: () => _goToDetail(id),
            ),
            DataCell(Text(att.status.displayName), onTap: () => _goToDetail(id)),
            DataCell(Text(att.checkOutEmployeeNote ?? ''), onTap: () => _goToDetail(id)),
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
          final isSelected = pageNum == currentPage;

          return ElevatedButton(
            onPressed: () {
              setState(() {
                currentPage = pageNum;
              });
              fetchAttendances();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isSelected ? Colors.blue : Colors.grey[300],
              foregroundColor: isSelected ? Colors.white : Colors.black,
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
      appBar: AppBar(title: const Text("Danh sách chấm công")),
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
