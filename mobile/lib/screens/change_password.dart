import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:provider/provider.dart';

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmNewPasswordCtrl = TextEditingController();

  bool _isLoading = false;

  bool _showPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmNewPassword = false;

  String? _errorMessage;
  String? _passwordError;
  String? _newPasswordError;
  String? _confirmNewPasswordError;

  Future<void> _handleChangePassword() async {
    FocusScope.of(context).unfocus();

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _passwordError = null;
      _newPasswordError = null;
      _confirmNewPasswordError = null;
    });

    final res = await AuthService.changePasswordApi(
      _passwordCtrl.text,
      _newPasswordCtrl.text,
      _confirmNewPasswordCtrl.text,
    );

    if (!mounted) return;

    if (res['status'] == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'change-password-successfully'.tr(),
            style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.bold),
          ),
          backgroundColor: Theme.of(context).primaryColor,
        ),
      );
      context.read<AuthProvider>().logout();
      Navigator.pushReplacementNamed(context, '/login');
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = res['message'];
        final errors = res['errors'];
        _passwordError = errors?['password'];
        _newPasswordError = errors?['newPassword'];
        _confirmNewPasswordError = errors?['confirmNewPassword'];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              CircleAvatar(
                backgroundColor: theme.primaryColor,
                radius: 34,
                child: const Icon(
                  Icons.lock_reset,
                  color: Colors.white,
                  size: 36,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                "ChangePassword".tr(),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 30),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: !_showPassword,
                decoration: InputDecoration(
                  labelText: 'Password'.tr(),
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
              const SizedBox(height: 20),
              TextFormField(
                controller: _newPasswordCtrl,
                obscureText: !_showNewPassword,
                decoration: InputDecoration(
                  labelText: 'NewPassword'.tr(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showNewPassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                    ),
                    onPressed: () =>
                        setState(() => _showNewPassword = !_showNewPassword),
                  ),
                  border: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  errorText: _newPasswordError?.tr(),
                ),
                enabled: !_isLoading,
                validator: (val) => (val == null || val.isEmpty)
                    ? 'password-is-required'.tr()
                    : null,
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _confirmNewPasswordCtrl,
                obscureText: !_showConfirmNewPassword,
                decoration: InputDecoration(
                  labelText: 'ConfirmNewPassword'.tr(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showConfirmNewPassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                    ),
                    onPressed: () => setState(
                      () => _showConfirmNewPassword = !_showConfirmNewPassword,
                    ),
                  ),
                  border: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  errorText: _confirmNewPasswordError?.tr(),
                ),
                enabled: !_isLoading,
                validator: (val) => (val == null || val.isEmpty)
                    ? 'confirm-password-is-required'.tr()
                    : null,
              ),
              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: theme.colorScheme.error,
                      width: 1,
                    ),
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
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => {_handleChangePassword()},
                      icon: const Icon(Icons.check_circle_outline),
                      label: Text(
                        _isLoading ? "Verifying".tr() : "Confirm".tr(),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      icon: const Icon(Icons.cancel),
                      label: Text(
                        _isLoading ? "Verifying".tr() : "Cancel".tr(),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade50,
                        foregroundColor: Colors.red.shade400,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
