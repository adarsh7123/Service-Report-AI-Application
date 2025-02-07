# 🛠️ Service-Report-Application System

> A web application for Service-Report-Application reports with voice recording, multilingual support, and automated report generation.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 Voice Recording | Record in any language |
| 🌐 Auto Translation | Instant translation to English |
| 📝 AI Reports | Smart repair report generation |
| 📧 Email Integration | Automated report sending |
| 👀 Preview System | Review before sending |
| 🔒 Authentication | Secure login system |

---

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn
- Git

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/adarsh7123/Service-Report-Application.git
cd Service-Report-Application
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

---

## ⚙️ Configuration

Create a `.env` file in the backend directory:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Authentication
TECH1_USER=tech1
TECH1_PASS=tech123
```

### 🔑 Getting Required Keys

#### Gmail App Password
1. Go to Google Account settings
2. Navigate to Security → App passwords
3. Generate new app password for "Mail"
4. Use in SMTP_PASSWORD

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create account/login
3. Go to API keys section
4. Generate new key
5. Use in OPENAI_API_KEY

---

## 🖥️ Running the Application

### Backend Server
```bash
cd backend
python app.py    # Runs on http://localhost:5000
```

### Frontend Development Server
```bash
cd frontend
npm run dev      # Runs on http://localhost:5173
```

---

## 📱 Using the Application

1. Visit http://localhost:5173
2. Login credentials:
   - Username: `tech1`
   - Password: `tech123`
3. Start recording or enter text
4. Preview and send report

---

## 💡 Features Usage

### Voice Recording
- Use "Start Recording" button
- Speak in any language
- Stop when finished
- Auto transcription begins

### Report Generation
- AI analyzes transcription
- Creates structured report
- Edit capabilities
- Preview feature

### Email Report
- Enter recipient
- Preview format
- Send report

---

## ❗ Troubleshooting

### Backend Issues
- Verify Python installation
- Check port availability
- Confirm .env setup

### Frontend Issues
```bash
npm cache clean --force
rm -rf node_modules && npm install
```

### Audio Recording
- Grant microphone access
- Use Chrome/Edge browser

### OpenAI Connection
```bash
pip install --upgrade openai
```

---

## 🛠️ Tech Stack

### Backend
- Python 3.8+
- Flask
- OpenAI API
- SQLite
- JWT Authentication
- SMTP Email Service

### Frontend
- React + Vite
- Tailwind CSS
- Material-UI
- React Router
- Axios
- React Speech Recognition

### Key Libraries
- OpenAI Whisper
- OpenAI GPT
- Email-validator
- Python-dotenv

---

## 📸 Screenshots

### Login Interface
![Login Page](screenshot/Screenshot%202025-02-06%20161357.png)

### Recording System
![Recording Interface](screenshot/Screenshot%202025-02-06%20161227.png)

### Report Generation Process
![Report Generation 1](screenshot/Screenshot%202025-02-06%20161241.png)
![Report Generation 2](screenshot/Screenshot%202025-02-06%20161253.png)

### Report Preview System
![Report Preview 1](screenshot/Screenshot%202025-02-06%20161313.png)
![Report Preview 2](screenshot/Screenshot%202025-02-06%20161325.png)

### Email Confirmation
![Email Confirmation](screenshot/Screenshot%202025-02-06%20161345.png)

### Email Receipt
![Email Receipt](screenshot/Screenshot%202025-02-06%20161454.png)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

For support, please [open an issue](https://github.com/adarsh7123/Service-Report-Application/issues) in the GitHub repository or contact the maintainers.