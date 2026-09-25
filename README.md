# AI Resume Analyzer

An AI-powered web application that analyzes resumes and provides an ATS-style score, skills matching, missing keywords, experience and project analysis, and personalized recommendations.

## Features

* User Registration and Login
* JWT-based Authentication
* Google Sign-In
* Forgot Password with OTP Verification
* Resume Upload
* PDF and DOCX Resume Support
* AI-powered Resume Analysis
* ATS Score
* Skills Matching
* Experience Analysis
* Project Analysis
* Keyword Analysis
* Missing Keywords Detection
* Personalized Resume Recommendations
* Analysis History
* Protected API Routes

## Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML
* CSS

### Backend

* Node.js
* Express.js
* REST API
* Multer
* JWT Authentication
* Google OAuth

### Database

* PostgreSQL
* Prisma ORM

### AI

* Groq AI

## Project Structure

```text
ai-resume-analyzer/
│
├── client/              # React + Vite frontend
│
├── server/              # Node.js + Express backend
│   ├── uploads/         # Temporary uploaded resumes
│   └── ...
│
├── .gitignore
└── README.md
```

## How It Works

1. Create an account or sign in using Google.
2. Upload a resume in PDF or DOCX format.
3. The backend extracts the resume text.
4. The extracted resume content is analyzed using Groq AI.
5. The application generates an ATS-style score and detailed analysis.
6. Users can view missing keywords and personalized recommendations.
7. Previous resume analyses can be viewed from the History section.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/NikhilSharma-web/ai-resume-analyzer.git
cd ai-resume-analyzer
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../server
npm install
```

## Environment Variables

Create a `.env` file inside the `server` folder.

```env
DATABASE_URL=your_postgresql_connection_string
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
```

Do not commit the `.env` file to GitHub.

## Running the Project Locally

### Start Backend

```bash
cd server
nodemon server.js
```

### Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

The backend will normally run on:

```text
http://localhost:5000
```

## API

The backend provides APIs for:

* User Registration
* User Login
* Google Authentication
* OTP Verification
* Resume Analysis
* Resume History

Example endpoints:

```text
POST /api/analyze
GET /api/history
```

## Authentication

The application supports:

* Email and Password Authentication
* Google Sign-In
* JWT-based Authentication
* OTP-based Password Recovery
* Protected API Routes

## Resume Analysis

The application analyzes uploaded resumes and provides:

* ATS Score
* Resume Status
* Skills Match
* Experience Analysis
* Project Analysis
* Keywords
* Missing Keywords
* AI-generated Summary
* Personalized Recommendations

## Security

* Passwords are securely hashed.
* Authentication is handled using JWT.
* Protected routes require authentication.
* Sensitive credentials are stored in environment variables.
* API keys and database credentials are not stored directly in the source code.
* `.env` files are excluded from Git using `.gitignore`.

## Future Improvements

* Job Description Matching
* Resume Improvement Suggestions
* Resume Comparison
* More Detailed ATS Analysis
* Additional AI-powered Career Recommendations

## Author

**Nikhil Sharma**

GitHub: https://github.com/NikhilSharma-web/
LinkedIn: www.linkedin.com/in/nikhil-sharma-69111434a
