# 🚇 TransitIQ — Public Transport Optimization System

A web app that finds the fastest public transport route between any two stops using **Dijkstra's Algorithm**.

Built with: Python (Flask) + HTML/CSS/JavaScript

---

## 📁 Folder Structure

```
transport-app/
├── app.py               ← Flask backend (main server)
├── routes.json          ← Stores all route data
├── requirements.txt     ← Python dependencies
├── .gitignore           ← Files Git should ignore
├── templates/
│   ├── index.html       ← Page 1: Route Finder
│   └── add_route.html   ← Page 2: Add New Route
└── static/
    ├── css/
    │   └── style.css    ← All styles
    └── js/
        ├── main.js      ← Page 1 logic
        └── add_route.js ← Page 2 logic
```

---

## 🚀 How to Run Locally (Step by Step for Beginners)

### Step 1 — Install Python
- Go to https://python.org/downloads
- Download Python 3.10 or newer
- During install on Windows: ✅ check "Add Python to PATH"
- Verify: open terminal and type `python --version`

### Step 2 — Open Terminal in the Project Folder
- Windows: Open the folder → right click → "Open in Terminal"
- Mac: Open Terminal → type `cd path/to/transport-app`

### Step 3 — Create a Virtual Environment
```bash
python -m venv venv
```
This creates an isolated Python environment for the project.

### Step 4 — Activate the Virtual Environment
- Windows:
```bash
venv\Scripts\activate
```
- Mac/Linux:
```bash
source venv/bin/activate
```
You'll see `(venv)` in your terminal — that means it worked.

### Step 5 — Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 6 — Run the App
```bash
python app.py
```
You'll see: `Running on http://127.0.0.1:5000`

### Step 7 — Open in Browser
Go to: **http://localhost:5000**

---

## 📤 How to Push to GitHub

### Step 1 — Install Git
- Download from https://git-scm.com/downloads
- Verify: `git --version`

### Step 2 — Configure Git (one time only)
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Step 3 — Create a Repo on GitHub
- Go to github.com → click "+" → New repository
- Name it `transport-app` → click Create

### Step 4 — Initialize and Push
Run these in your project folder:
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/transport-app.git
git push -u origin main
```

### Every time you make changes:
```bash
git add .
git commit -m "describe your change"
git push
```

---

## 🧠 How the Algorithm Works

Dijkstra's algorithm finds the **shortest path** (by travel time) between two stops in a weighted graph. Each route submitted is an edge in the graph. The algorithm explores all possible paths and always picks the one with the lowest cumulative time.
