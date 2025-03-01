import { useState, useEffect } from "react";
import "./WikiGame.css";

function WikiGame() {
    const [currentPage, setCurrentPage] = useState("");
    const [targetPage, setTargetPage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [content, setContent] = useState("");

    useEffect(() => {
        const fetchRandomPage = async () => {
            try {
                const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/title");
                const data = await response.json();
                setCurrentPage(data.items[0].title);

                const responseTarget = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/title");
                const dataTarget = await responseTarget.json();
                setTargetPage(dataTarget.items[0].title);
            } catch (error) {
                console.error("Erreur lors du chargement de la page aléatoire", error);
            }
        };
        fetchRandomPage();
    }, []);

    useEffect(() => {
        if (!currentPage) return;
        const fetchWikiContent = async () => {
            try {
                const response = await fetch(
                    `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(currentPage)}`
                );
                if (!response.ok) throw new Error("Erreur de récupération");
                const htmlContent = await response.text();
                setContent(htmlContent);
                setHistory((prev) => [...prev, currentPage]);
            } catch (error) {
                console.error(error);
            }
        };
        fetchWikiContent();
    }, [currentPage]);

    return (
        <div className="wiki-game">
            <div className="left-panel">
                <div className="wiki-frame">
                    <h1>WikiExplorer</h1>
                    <h2>Objectif : {targetPage}</h2>
                    <div
                        className="wiki-content"
                        dangerouslySetInnerHTML={{ __html: content }}
                        onClick={(e) => {
                            const target = e.target as HTMLAnchorElement;
                            if (target.tagName === "A") {
                                e.preventDefault();
                                const newPage = target.innerText;
                                setCurrentPage(newPage);
                            }
                        }}
                    ></div>
                </div>
                <div className="artifacts-bar">
                    <h2>Artéfacts</h2>
                    <div className="artifact-bar">
                    </div>
                </div>
            </div>
            <div className="right-panel">
                <div className="code-frame">
                    <h2>Code</h2>
                    <div className="code-box">
                        <p>code:257894</p>
                    </div>
                </div>
                <div className="player-frame">
                    <h2>Joueurs</h2>
                    <div className="players-list">
                        <p>Pepito</p>
                    </div>
                </div>
                <div className="chat-frame">
                    <h2>Chat</h2>
                    <div className="chat-box">
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WikiGame;