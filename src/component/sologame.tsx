import { useState, useEffect } from "react";
import "./sologame.css";

function SoloGame() {
    const [currentPage, setCurrentPage] = useState("");
    const [targetPage, setTargetPage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [content, setContent] = useState("");
    const [objectivesCompleted, setObjectivesCompleted] = useState(0);
    const [sitesToVisit, setSitesToVisit] = useState(1);

    const fetchRandomPage = async () => {
        try {
            const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
            const data = await response.json();
            return data.items[0].title;
        } catch (error) {
            console.error("Erreur lors du chargement d'une page aléatoire", error);
            return null;
        }
    };

    const initGame = async () => {
        const startPage = await fetchRandomPage();
        const newTargetPage =  "Gustave_Eiffel"; //await fetchRandomPage();
        if (startPage && newTargetPage) {
            setCurrentPage(startPage);
            setTargetPage(newTargetPage);
            setHistory([startPage]);
            setCurrentIndex(0);
        }
    };

    useEffect(() => {
        initGame();
    }, []);

    useEffect(() => {
        if (!currentPage) return;
        const fetchWikiContent = async () => {
            try {
                const response = await fetch(
                    `https://fr.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(currentPage)}`
                );
                if (!response.ok) throw new Error("Erreur de récupération");
                const htmlContent = await response.text();
                setContent(htmlContent);

                if (history[history.length - 1] !== currentPage) {
                    setHistory((prev) => [...prev, currentPage]);
                    setCurrentIndex((prev) => prev + 1);
                }

                handleObjectiveCompletion();
            } catch (error) {
                console.error(error);
                setContent("<p>Erreur lors du chargement de la page.</p>");
            }
        };
        fetchWikiContent();
    }, [currentPage]);

    const handleLinkClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLAnchorElement;
        if (target.tagName === "A") {
            e.preventDefault();
            const newPage = decodeURIComponent(target.href.split("/wiki/")[1] || "");
            if (newPage) {
                setCurrentPage(newPage);
            }
        }
    };

    const goBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setCurrentPage(history[currentIndex - 1]);
        }
    };

    const goForward = () => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentPage(history[currentIndex + 1]);
        }
    };

    const handleObjectiveCompletion = () => {
        if (currentPage === targetPage) {
            setObjectivesCompleted((prev) => prev + 1);
            setSitesToVisit((prev) => Math.max(0, prev - 1));
            setTimeout(initGame, 2000);
        }
    };

    return (
        <div className="wiki-game">
            <div className="left-panel">
                <div className="wiki-frame">
                    <h1>WikiExplorer</h1>
                    <h2 className="blanc">Objectif : {targetPage}</h2>
                    <div className="navigation-buttons">
                        <button onClick={goBack} disabled={currentIndex <= 0}>⬅️ Précédent</button>
                        <button onClick={goForward} disabled={currentIndex >= history.length - 1}>➡️ Suivant</button>
                    </div>
                    <div
                        className="wiki-content"
                        dangerouslySetInnerHTML={{ __html: content }}
                        onClick={handleLinkClick}
                    ></div>
                </div>
            </div>
            <div className="right-panel">
                <div className="objective-frame">
                    <h2  className="blanc">Objectifs réussis</h2>
                    <div className="objective-box">
                        <p>{objectivesCompleted} objectifs atteints</p>
                        <p>{sitesToVisit} sites restants</p>
                    </div>
                </div>

                <div className="history-frame">
                    <h2  className="blanc">Articles parcourus</h2>
                    <div className="history-box">
                        {history.map((article, index) => (
                            <p key={index}>
                                <a href={`https://fr.wikipedia.org/wiki/${encodeURIComponent(article)}`} target="_blank" rel="noopener noreferrer">
                                    {article}
                                </a>
                            </p>
                        ))}
                    </div>
                </div>

                <div className="artifacts-frame">
                    <h2  className="blanc" >Artéfacts</h2>
                    <div className="artifacts-box"></div>
                </div>
            </div>
        </div>
    );
}

export default SoloGame;
