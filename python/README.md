# Face Recognition Backend (Flask)

A minimal Flask backend for face recognition on **Windows** with **Python 3.10.11**.

---

## Requirements

- Python **3.10.11**
- **VS Code**
- Windows environment (**PowerShell** terminal)

---

## Installation & Run Guide

### 1 Install system dependencies
- **Install Visual Studio Build Tools**:  
  👉 https://visualstudio.microsoft.com/visual-cpp-build-tools/  
  - Select workload: **Desktop development with C++**

- **Install CMake**:  
  👉 https://cmake.org/download/  
  - During setup, tick **Add CMake to system PATH**

### 2 Clone the repository
```powershell
git clone <url_repo>
cd <folder_project>
```
### 3 Create a Python virtual environment
```powershell
python -m venv venv310
```

### 4 Notes for VS Code
- After creating the virtual environment (`venv310`), make sure VS Code is using it.  
- Press **Ctrl + Shift + P** → search for **Python: Select Interpreter**.  
- Choose the interpreter at:
```
.venv310\Scripts\python.exe
```
- Open a new terminal in VS Code; the prompt should show `(venv310)` if activated correctly.

### 5 Activate the virtual environment
```powershell
& ".\venv310\Scripts\Activate.ps1"
```

> If you see a script execution policy error, run this once, then activate again:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 6 Upgrade Python build tools
```powershell
python -m pip install --upgrade pip setuptools wheel
```

### 7 Install Python libraries
```powershell
python -m pip install -r requirements.txt
```

### 8 Quick import check (optional)
```powershell
python -c "import face_recognition, face_recognition_models; print('OK')"
```

### 9 Run the Flask application
```powershell
python app.py
```

> The server typically starts at: http://127.0.0.1:5000/
