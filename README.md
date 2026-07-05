# BigQuery Release Notes Hub 🚀

A real-time aggregator and interactive dashboard for Google Cloud BigQuery release notes. The application fetches, parses, structures, and presents Google's official BigQuery release notes feed into a clean, modern interface.

Repository URL: [https://github.com/Pruthvi695/antigravity-event-talks-app](https://github.com/Pruthvi695/antigravity-event-talks-app)

---

## ✨ Features

- 🛰️ **Dynamic RSS Parsing**: Pulls real-time entries directly from Google Cloud's BigQuery Release Feed.
- 🧩 **BeautifulSoup Parsing**: Splices complex daily RSS updates into individual release notes (Features, Changes, Deprecations) using header boundaries.
- ⚡ **Interactive Dashboard**:
  - Live filter pills (Features, Changes, Deprecated, and Others).
  - High-performance text searching across update types, dates, and contents.
  - Interactive "Share on X" composer modal with real-time character limit validation and SVG progress ring.
  - Sleek clipboard copying.
  - Toast confirmation notifications.
- 📱 **Responsive Design**: Mobile-friendly layout using modern CSS variables, CSS Grid, and custom animations.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, Flask (Web routing & API handling)
- **HTML Parsing**: `BeautifulSoup4`, standard library `xml.etree.ElementTree`
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), and Vanilla ES6+ JavaScript
- **Icons**: Lucide Icons library

---

## 📂 Project Structure

```text
├── app.py                # Main Flask server and parser pipeline
├── requirements.txt      # Python dependencies
├── test_parser.py        # Parser tests
├── .gitignore            # Git ignore rules
├── README.md             # Project documentation
├── static/
│   ├── css/
│   │   └── style.css     # Premium UI styling rules
│   └── js/
│       └── app.js        # Frontend state management & DOM logic
└── templates/
    └── index.html        # Main dashboard HTML template
```

---

## ⚡ Getting Started (Local Run)

### 1. Prerequisites
Make sure you have Python 3 installed. You can verify with:
```bash
python3 --version
```

### 2. Set Up Virtual Environment & Dependencies
Navigate to the project folder, create/activate your virtual environment, and install dependencies:
```bash
# Navigate to project folder
cd bigquery_release_notes

# Create a virtual environment (if not already done)
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Server
Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to: **[http://localhost:5001](http://localhost:5001)**

---

## 🧪 Running Tests
You can run parser validation checks using:
```bash
python test_parser.py
```
