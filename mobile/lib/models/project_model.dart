import 'package:flutter/material.dart';

class Task {
  final String name;
  final String? assignee;
  final String status;

  Task({
    required this.name,
    this.assignee,
    required this.status,
  });
}

class Phase {
  final String name;
  final String status;
  final List<Task> tasks;

  Phase({
    required this.name,
    required this.status,
    required this.tasks,
  });
}

class Project {
  final String name;
  final String code;
  final String pmName;
  final String status;
  final double progress;
  final List<Phase> phases;

  Project({
    required this.name,
    required this.code,
    required this.pmName,
    required this.status,
    required this.progress,
    required this.phases,
  });
}
