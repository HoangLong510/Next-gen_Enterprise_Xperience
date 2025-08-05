import 'package:flutter/material.dart';
import 'package:mobile/models/account.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider extends ChangeNotifier {
  Account? _account;

  Account? get account => _account;

  bool get isLoggedIn => _account != null;

  void setAccount(Account account) {
    _account = account;
    notifyListeners();
  }

  void logout() async {
    _account = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    notifyListeners();
  }
}
