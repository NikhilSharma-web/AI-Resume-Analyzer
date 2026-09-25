import { useEffect, useState } from "react";
import "./History.css"

function History({onViewAnalysis}) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const token = sessionStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/history",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                return;
            }

            setHistory(data.history);
        } catch (error) {
            console.error("History Error:", error)
            alert("Could not connect to backend.")
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchHistory();
    }, []);

    return (
        <div className="history-page">
            <div className="history-header">
                <div>
                    <p className="history-subtitle">Your Resume Analyses</p>
                    <h1>Analysis History</h1>
                </div>
            </div>
            {loading ? (
                <div className="history-empty">
                    <p>Loading History...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="history-empty">
                    <h2>No Analysis Yet</h2>
                    <p>
                        Upload your resume to see your analysis history here.
                    </p>
                </div>
            ) : (
                <div className="history-list">
                    {history.map((item) => (
                        <div className="history-card" key={item.id} onClick={() => {
                            onViewAnalysis(item)
                        }}>

                            <div className="history-file">
                                <div className="history-icon">📄</div>

                                <div>
                                    <h2>{item.filename}</h2>

                                    <p>{new Date(
                                        item.createdAt).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="history-score">
                                <span>ATS Score</span>
                                <strong>{item.atsScore}/100</strong>
                            </div>
                            <div className="history-status">
                                <span>{item.resumeStatus}</span>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default History