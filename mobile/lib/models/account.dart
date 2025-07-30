class Account {
  final int? id;
  final String? username;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? phone;
  final String? address;
  final String? gender;
  final String? role;
  final String? avatar;
  final String? department;
  final DateTime? dateBirth;
  final DateTime? createdAt;

  Account({
    this.id,
    this.username,
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.address,
    this.gender,
    this.role,
    this.avatar,
    this.department,
    this.dateBirth,
    this.createdAt,
  });

  factory Account.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(String? value) {
      if (value == null || value.isEmpty) return null;
      try {
        return DateTime.parse(value);
      } catch (_) {
        return null;
      }
    }

    return Account(
      id: json['id'] is int
          ? json['id'] as int
          : (json['id'] != null ? int.tryParse(json['id'].toString()) : null),

      username: json['username']?.toString(),
      firstName: json['firstName']?.toString(),
      lastName: json['lastName']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      gender: json['gender']?.toString(),
      role: json['role']?.toString(),
      avatar: json['avatar']?.toString(),
      department: json['department']?.toString(),

      dateBirth: parseDate(json['dateBirth']?.toString()),
      createdAt: parseDate(json['createdAt']?.toString()),
    );
  }
}
