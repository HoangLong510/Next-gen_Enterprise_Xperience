import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Hello, World!', style: TextStyle(fontSize: 24)),
          Text('This is a Flutter app.', style: TextStyle(fontSize: 18)),
          Text('Welcome!', style: TextStyle(fontSize: 20)),
          Text('Have a nice day!', style: TextStyle(fontSize: 16)),
        ],
      ),
    );
  }
}
