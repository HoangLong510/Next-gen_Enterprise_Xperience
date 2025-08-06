import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/widgets/language_switcher.dart'; // Import mới

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _showPassword = false;
  bool _isLoading = false;

  String? _errorMessage;
  String? _usernameError;
  String? _passwordError;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    FocusScope.of(context).unfocus();

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _usernameError = null;
      _passwordError = null;
    });

    final res = await AuthService.loginApi(
      _usernameCtrl.text.trim(),
      _passwordCtrl.text,
    );

    if (!mounted) return;

    if (res['status'] == 200) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('accessToken', res['data']['accessToken']);
      await prefs.setString('refreshToken', res['data']['refreshToken']);

      final account = await AuthService.fetchAccountDataApi();

      if (!mounted) return;

      if (account != null) {
        context.read<AuthProvider>().setAccount(account);
        Navigator.pushReplacementNamed(context, '/');
      } else {
        setState(() {
          _errorMessage = 'invalid-access-token'.tr();
        });
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = res['message'];
        final errors = res['errors'];
        _usernameError = errors?['username'];
        _passwordError = errors?['password'];
      });
    }

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Stack(
      children: [
        Scaffold(
          body: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: _buildLoginForm(theme),
            ),
          ),
        ),
        const SafeArea(
          child: Align(
            alignment: Alignment.topRight,
            child: Padding(
              padding: EdgeInsets.only(top: 8, right: 16),
              child: LanguageSwitcher(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginForm(ThemeData theme) {
    return Container(
      width: 400,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface.withOpacity(0.95),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withOpacity(0.08),
            blurRadius: 30,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            CircleAvatar(
              backgroundColor: theme.primaryColor,
              radius: 34,
              child: const Icon(Icons.security, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 18),
            Text(
              "Login".tr(),
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Login with your account".tr(),
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 30),
            TextFormField(
              controller: _usernameCtrl,
              decoration: InputDecoration(
                labelText: 'Username'.tr(),
                prefixIcon: const Icon(Icons.person_outline),
                border: const OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                ),
                errorText: _usernameError?.tr(),
              ),
              enabled: !_isLoading,
              validator: (val) => (val == null || val.isEmpty)
                  ? 'username-is-required'.tr()
                  : null,
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _passwordCtrl,
              obscureText: !_showPassword,
              decoration: InputDecoration(
                labelText: 'Password'.tr(),
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _showPassword ? Icons.visibility : Icons.visibility_off,
                  ),
                  onPressed: () =>
                      setState(() => _showPassword = !_showPassword),
                ),
                border: const OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                ),
                errorText: _passwordError?.tr(),
              ),
              enabled: !_isLoading,
              validator: (val) => (val == null || val.isEmpty)
                  ? 'password-is-required'.tr()
                  : null,
            ),
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: theme.colorScheme.error, width: 1),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.error_outline, color: theme.colorScheme.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!.tr(),
                        style: TextStyle(
                          color: theme.colorScheme.error,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _handleLogin,
                icon: _isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.login),
                label: Text(_isLoading ? "Verifying".tr() : "Login".tr()),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  textStyle: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(height: 30),
            Text(
              "Accounts are provided by the administrator only".tr(),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.hintColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
