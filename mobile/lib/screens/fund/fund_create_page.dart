import 'package:flutter/material.dart';

class FundCreatePage extends StatelessWidget {
  const FundCreatePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Tạo quỹ mới")),
      body: const Center(child: Text("Form tạo quỹ ở đây")),
    );
  }
}