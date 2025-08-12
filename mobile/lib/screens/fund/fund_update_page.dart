import 'package:flutter/material.dart';

class FundUpdatePage extends StatelessWidget {
  final int id;
  const FundUpdatePage({super.key, required this.id});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Chỉnh sửa quỹ #$id")),
      body: Center(child: Text("Form chỉnh sửa quỹ ID: $id")),
    );
  }
} 