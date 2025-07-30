export const getProjectDetail = (projectId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 200,
        data: {
          data: {
            id: projectId,
            name: "Redesign Website",
            description: "Revamp the entire company website with modern design.",
            status: "ACTIVE",
            priority: "HIGH",
            pmName: "Alice Johnson",
            createdAt: "2024-07-01",
            deadline: "2024-08-01",
            repoLink: "",
            tasks: [
              {
                id: 1,
                name: "Design Homepage",
                doneSubtasks: 3,
                totalSubtasks: 5,
                manager: "Bob",
                deadline: "2024-07-25",
              },
              {
                id: 2,
                name: "Implement UI",
                doneSubtasks: 1,
                totalSubtasks: 4,
                manager: "Jane",
                deadline: "2024-07-27",
              },
              {
                id: 3,
                name: "Setup Backend",
                doneSubtasks: 5,
                totalSubtasks: 5,
                manager: "David",
                deadline: "2024-07-28",
              },
              {
                id: 4,
                name: "Deploy to Production",
                doneSubtasks: 0,
                totalSubtasks: 1,
                manager: "Emily",
                deadline: "2024-07-29",
              },
              {
                id: 5,
                name: "Test and Deploy",
                doneSubtasks: 0,
                totalSubtasks: 1,
                manager: "Emily",
                deadline: "2024-07-29",
              },
            ],
          },
        },
      })
    }, 500) // mô phỏng delay API 500ms
  })
}
