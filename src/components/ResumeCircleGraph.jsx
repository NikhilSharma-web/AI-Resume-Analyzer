import "./ResumeCircleGraph.css";

function ResumeCircleGraph({ analysis }) {
    if (!analysis) return null;

    const steps = [
        {
            number: "01",
            title: "ATS SCORE",
            score: analysis.atsScore,
            className: "segment-1",
            icon: "📄",
        },
        {
            number: "02",
            title: "SKILLS",
            score: analysis.skillsMatch,
            className: "segment-2",
            icon: "⚙",
        },
        {
            number: "03",
            title: "EXPERIENCE",
            score: analysis.experience,
            className: "segment-3",
            icon: "💼",
        },
        {
            number: "04",
            title: "PROJECTS",
            score: analysis.projects,
            className: "segment-4",
            icon: "</>",
        },
        {
            number: "05",
            title: "KEYWORDS",
            score: analysis.keywords,
            className: "segment-5",
            icon: "⌕",
        },
    ];

    return (
        <div className="resume-circle-wrapper">
            <div className="resume-circle">

                {/* CENTER */}

                <div className="circle-center">
                    <span className="center-title">RESUME</span>
                    <span className="center-subtitle">ANALYSIS</span>

                    <div className="center-line">
                        <span></span>
                        <span></span>
                    </div>
                </div>

                {/* SEGMENTS */}

                {steps.map((step) => (
                    <div
                        key={step.number}
                        className={`segment-group ${step.className}`}
                    >

                        {/* COLORED SEGMENT */}

                        <div className="circle-segment">

                            <div className="segment-content">

                                <div className="segment-icon">
                                    {step.icon}
                                </div>

                                <span className="segment-title">
                                    {step.title}
                                </span>

                                <strong className="segment-score">
                                    {step.score}%
                                </strong>

                            </div>

                        </div>

                        {/* STEP BADGE - OUTSIDE SEGMENT */}

                        <div className="step-badge">
                            <span>STEP</span>
                            <strong>{step.number}</strong>
                        </div>

                    </div>
                ))}

            </div>
        </div>
    );
}

export default ResumeCircleGraph;