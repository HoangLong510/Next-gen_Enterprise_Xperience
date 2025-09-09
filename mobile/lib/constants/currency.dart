import 'package:intl/intl.dart';

final _vndFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
String formatVND(num? n) => _vndFmt.format(n ?? 0);
