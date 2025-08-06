import 'package:flutter/material.dart';

final rootTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFF118D57)),
  scaffoldBackgroundColor: Colors.white,
  fontFamily: 'RobotoMono',
  useMaterial3: true,
  appBarTheme: AppBarTheme(
    backgroundColor: Color(0xFF118D57),
    foregroundColor: Colors.white,
    centerTitle: true,
    elevation: 4,
    titleTextStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
  ),
);
