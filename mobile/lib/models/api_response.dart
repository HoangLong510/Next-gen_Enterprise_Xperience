class ApiResponse {
  final int status;
  final String? message;
  final dynamic data;

  ApiResponse({
    required this.status,
    this.message,
    this.data,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json) {
    return ApiResponse(
      status: json['status'],
      message: json['message'],
      data: json['data'],
    );
  }
}
