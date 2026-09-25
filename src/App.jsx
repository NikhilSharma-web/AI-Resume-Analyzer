import { useState } from "react"

import "./App.css"

import ResumeCircleGraph from "./components/ResumeCircleGraph";

import Login from "./pages/Login";

import Register from "./pages/Regsiter";

import History from "./pages/History";

import Analysis from "./pages/Analysis"

import ForgotPassword from "./pages/ForgotPassword";


function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!sessionStorage.getItem("token")
  );

  const [currentUser, setCurrentUser] = useState(
    JSON.parse(sessionStorage.getItem("user")) || null
  );

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [showRegister, setShowRegister] = useState(true);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");

  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);

  const [selectedAnalysis, setSelectedAnalysis] = useState(null);


  const getScoreClass = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Average";
    return "Needs-improvement";
  }


  const handleResumeUpload = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or DOCX File.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File Size must be less than 5MB.");
      return;
    }

    setResume(file);

    // sending resume to backend
    const formData = new FormData();

    formData.append("resume", file);

    try {

      setLoading(true);

      const token = sessionStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/analyze",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setAnalysis(data.analysis);

      alert("resume uploaded successfully");

    } catch (e) {

      console.error("Error:", e);

      alert("Could not connect to backend");

    } finally {

      setLoading(false);

    }

  };


  if (!isLoggedIn) {

    if (showRegister) {

      return (
        <Register

          onLogin={() => setShowRegister(false)}

          onGoogleSignup={(user) => {

            setCurrentUser(user);

            setIsLoggedIn(true);

          }}

        />
      );

    }


    if (showForgotPassword) {

      return (
        <ForgotPassword

          email={forgotEmail}

          onLogin={() => {
            setShowForgotPassword(false);
          }}

        />
      );

    }


    return (

      <Login

        onLogin={(user) => {

          setCurrentUser(user);

          setIsLoggedIn(true);

        }}

        onRegister={() => setShowRegister(true)}

        onForgotPassword={(email) => {

          setForgotEmail(email);

          setShowForgotPassword(true);

        }}

      />

    );

  }


  return (

    <>

      <div className="app">

        {/* SIDEBAR */}

        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

          {/* MOBILE CLOSE BUTTON */}

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>


          <h2>AI Resume</h2>

          <p className="logo-subtitle">Analyzer</p>


          <nav>

            <button
              onClick={() => {
                setCurrentPage("dashboard");
                setSidebarOpen(false);
              }}
            >
              Dashboard
            </button>


            <button
              onClick={() => {
                setCurrentPage("dashboard");

                // Clear previous analysis for new analysis
                setResume(null);
                setAnalysis(null);
                setSelectedAnalysis(null);

                setSidebarOpen(false);
              }}
            >
              New Analysis
            </button>


            <button
              onClick={() => {
                setCurrentPage("history");
                setSidebarOpen(false);
              }}
            >
              History
            </button>

          </nav>


          <div className="sidebar-bottom">

            <button>
              Setting
            </button>


            <button

              onClick={() => {

                sessionStorage.removeItem("token");

                sessionStorage.removeItem("user");

                // Clear previous user's data
                setResume(null);

                setAnalysis(null);

                setSelectedAnalysis(null);

                setCurrentUser(null);

                setIsLoggedIn(false);

                setCurrentPage("dashboard");

                setSidebarOpen(false);

              }}

            >
              Logout
            </button>

          </div>

        </aside>


        {/* MAIN */}

        <main className="main">

          {/* MOBILE HAMBURGER BUTTON */}

          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>


          {currentPage === "dashboard" && (

            <>

              <header>

                <div>

                  <p className="welcome">
                    Welcome Back, {currentUser?.name}👋
                  </p>

                  <h1>
                    Resume Dashboard
                  </h1>

                </div>


                <button
                  className="analyze-btn"
                  onClick={() => {

                    setResume(null);

                    setAnalysis(null);

                    setSelectedAnalysis(null);

                  }}
                >
                  + New Analysis
                </button>

              </header>


              <section className="upload-section">

                <div className="upload-card">

                  <div className="upload-icon">
                    📄
                  </div>


                  <h2>
                    Upload your resume
                  </h2>


                  <p>
                    Upload your PDF or DOCX resume and let AI analyze it.
                  </p>


                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf, .docx"
                    onChange={handleResumeUpload}
                    hidden
                  />


                  <label
                    htmlFor="resume-upload"
                    className="upload-btn"
                  >
                    {loading ? "Analyzing..." : "Choose Resume"}
                  </label>


                  <small>
                    PDF or DOCX • Maximum 5MB
                  </small>


                  {resume && (

                    <div className="selected-file">
                      ✅ {resume.name}
                    </div>

                  )}

                </div>


                <div className="score-card">

                  <div
                    className={`score ${
                      analysis
                        ? getScoreClass(analysis.atsScore)
                        : ""
                    }`}
                  >

                    <span className="score-number">

                      {analysis
                        ? analysis.atsScore
                        : ""}

                    </span>


                    <span className="score-total">
                      /100
                    </span>

                  </div>


                  <p className="score-text">

                    {analysis
                      ? analysis.resumeStatus
                      : "Upload a Resume to Analyze"}

                  </p>


                  <button

                    onClick={() => {

                      if (analysis) {

                        setSelectedAnalysis(analysis);

                        setCurrentPage("analysis");

                      }

                    }}

                  >
                    View Analysis →
                  </button>

                </div>

              </section>


              <h2 className="section-title">
                Resume Insights
              </h2>


              <section className="stats">

                <div className="stat-card">

                  <span>
                    Skills Match
                  </span>

                  <strong>
                    {analysis
                      ? analysis.skillsMatch
                      : "--"}
                  </strong>

                </div>


                <div className="stat-card">

                  <span>
                    Experience
                  </span>

                  <strong>
                    {analysis
                      ? analysis.experience
                      : "--"}
                  </strong>

                </div>


                <div className="stat-card">

                  <span>
                    Projects
                  </span>

                  <strong>
                    {analysis
                      ? analysis.projects
                      : "--"}
                  </strong>

                </div>


                <div className="stat-card">

                  <span>
                    Keywords
                  </span>

                  <strong>
                    {analysis
                      ? analysis.keywords
                      : "--"}
                  </strong>

                </div>

              </section>


              {analysis && (

                <section className="circle-graph-section">

                  <h2 className="section-title">
                    Resume Performance
                  </h2>

                  <div className="info-card">

                    <ResumeCircleGraph
                      analysis={analysis}
                    />

                  </div>

                </section>

              )}


              {analysis && (

                <section className="summary-card">

                  <h2>
                    AI Resume Summary
                  </h2>

                  <p>
                    {analysis.summary}
                  </p>

                </section>

              )}


              <section className="bottom-section">

                <div className="info-card">

                  <h2>
                    Missing Keywords
                  </h2>


                  <div className="tags">

                    {analysis?.missingKeywords?.map(
                      (keyword, index) => (

                        <span key={index}>
                          {keyword}
                        </span>

                      )
                    )}

                  </div>

                </div>


                <div className="info-card">

                  <h2>
                    AI Recommendations
                  </h2>


                  {analysis?.recommendations?.map(
                    (recommendation, index) => (

                      <p key={index}>
                        ✓ {recommendation}
                      </p>

                    )
                  )}

                </div>

              </section>

            </>

          )}


          {currentPage === "history" && (

            <History

              onViewAnalysis={(item) => {

                setSelectedAnalysis(item);

                setCurrentPage("analysis");

                setSidebarOpen(false);

              }}

            />

          )}


          {currentPage === "analysis" &&
            selectedAnalysis && (

              <Analysis
                analysis={selectedAnalysis}
              />

            )}

        </main>

      </div>

    </>

  )

}


export default App