import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/services/transaction_service.dart';
import 'package:mobile/models/api_response.dart'; // 👈 import ApiResponse

class CreateTransactionPage extends StatefulWidget {
  final int fundId; // Accept fundId parameter

  const CreateTransactionPage({Key? key, required this.fundId})
      : super(key: key);

  @override
  _CreateTransactionPageState createState() => _CreateTransactionPageState();
}

class _CreateTransactionPageState extends State<CreateTransactionPage> {
  final _formKey = GlobalKey<FormState>();
  String? _type;
  double? _amount;
  String? _note;
  File? _file;

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage() async {
    final pickedFile =
        await _picker.pickImage(source: ImageSource.gallery); // or .camera
    if (pickedFile != null) {
      setState(() {
        _file = File(pickedFile.path);
      });
    }
  }

  void _submitTransaction() async {
    if (_formKey.currentState!.validate()) {
      try {
        print(
            "Submitting Transaction: fundId=${widget.fundId}, type=$_type, amount=$_amount, note=$_note, file=$_file");

        // Call service
        final ApiResponse response =
            await TransactionService.createTransaction(
          fundId: widget.fundId,
          type: _type!,
          amount: _amount!,
          note: _note,
          file: _file,
        );

        if (response.status == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? "Transaction created")),
          );
          Navigator.pop(context, true); // quay về list
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(response.message ?? "Failed with ${response.status}")),
          );
        }
      } catch (e) {
        print("Error creating transaction: $e");
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create transaction: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Transaction')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              DropdownButtonFormField<String>(
                value: _type,
                decoration:
                    const InputDecoration(labelText: 'Transaction Type'),
                items: ['INCREASE', 'DECREASE']
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    _type = value;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please select a type';
                  }
                  return null;
                },
              ),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Amount'),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  _amount = double.tryParse(value);
                },
                validator: (value) {
                  if (value == null ||
                      value.isEmpty ||
                      double.tryParse(value) == null) {
                    return 'Please enter a valid amount';
                  }
                  return null;
                },
              ),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Note'),
                onChanged: (value) {
                  _note = value;
                },
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _pickImage,
                child: const Text('Pick an image'),
              ),
              if (_file != null) ...[
                const SizedBox(height: 20),
                Image.file(_file!, height: 100, width: 100),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _submitTransaction,
                child: const Text('Submit Transaction'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
