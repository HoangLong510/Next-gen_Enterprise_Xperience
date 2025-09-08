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

 void updateAccount({
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? address,
    String? gender,
    String? avatar,
    String? department,
  }) {
    if (_account != null) {
      _account = _account!.copyWith(
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        address: address,
        gender: gender,
        avatar: avatar,
        department: department,
      );
      notifyListeners();
    }
  }

  void logout() async {
    _account = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    notifyListeners();
  }
}
