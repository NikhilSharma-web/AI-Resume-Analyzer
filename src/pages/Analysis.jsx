function Analysis({ analysis }) {
    return (
        <div className="analysis-page">

            <div className="history-header">
                <div>
                    <p className="history-subtitle">Resume Analysis</p>
                    <h1>{analysis.filename}</h1>
                </div>
            </div>

            <section className="stats">

                <div className="stat-card">
                    <span>ATS Score</span>
                    <strong>{analysis.atsScore}/100</strong>
                </div>

                <div className="stat-card">
                    <span>Skills Match</span>
                    <strong>{analysis.skillsMatch}</strong>
                </div>

                <div className="stat-card">
                    <span>Experience</span>
                    <strong>{analysis.experience}</strong>
                </div>

                <div className="stat-card">
                    <span>Projects</span>
                    <strong>{analysis.projects}</strong>
                </div>

            </section>

            <section className="summary-card">
                <h2>AI Resume Summary</h2>
                <p>{analysis.summary}</p>
            </section>

            <section className="bottom-section">

                <div className="info-card">
                    <h2>Missing Keywords</h2>

                    <div className="tags">
                        {analysis.missingKeywords?.length > 0 ? (
                            analysis.missingKeywords.map((keyword, index) => (
                                <span key={index}>
                                    {keyword}
                                </span>
                            ))
                        ) : (
                            <p>No missing keywords.</p>
                        )}
                    </div>
                </div>

                <div className="info-card">
                    <h2>AI Recommendations</h2>

                    {analysis.recommendations?.length > 0 ? (
                        analysis.recommendations.map(
                            (recommendation, index) => (
                                <p key={index}>
                                    ✓ {recommendation}
                                </p>
                            )
                        )
                    ) : (
                        <p>No recommendations available.</p>
                    )}

                </div>

            </section>

        </div>
    );
}

export default Analysis;