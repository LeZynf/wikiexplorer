import { useState, useEffect } from "react";
import "./sologame.css";

function SoloGame() {
    const [currentPage, setCurrentPage] = useState("");
    const [targetPage, setTargetPage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [objectivesCompleted, setObjectivesCompleted] = useState(0);
    const [sitesToVisit, setSitesToVisit] = useState(5); // Nombre d'objectifs à atteindre

    // Récupérer une page aléatoire au démarrage
    useEffect(() => {
        const fetchRandomPage = async () => {
            try {
                const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
                const data = await response.json();
                setCurrentPage(data.items[0].title);

                const responseTarget = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
                const dataTarget = await responseTarget.json();
                setTargetPage(dataTarget.items[0].title);
            } catch (error) {
                console.error("Erreur lors du chargement de la page aléatoire", error);
            }
        };
        fetchRandomPage();
    }, []);

    // Vérifier si la page actuelle correspond à l'objectif
    useEffect(() => {
        if (!currentPage || !targetPage) return;

        if (currentPage === targetPage) {
            // Objectif atteint
            setObjectivesCompleted((prev) => prev + 1); // Ajouter 1 aux objectifs complétés
            setSitesToVisit((prev) => prev - 1); // Enlever 1 aux sites restants

            // Changer l'objectif si le nombre d'objectifs n'est pas encore atteint
            if (sitesToVisit > 1) {
                const fetchNewTargetPage = async () => {
                    try {
                        const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
                        const data = await response.json();
                        setTargetPage(data.items[0].title);
                    } catch (error) {
                        console.error("Erreur lors du chargement de la nouvelle page objectif", error);
                    }
                };
                fetchNewTargetPage();
            } else {
                // Tous les objectifs sont atteints
                console.log("Tous les objectifs sont atteints !");
            }
        }
    }, [currentPage, targetPage, sitesToVisit]);

    // Récupérer le contenu de la page actuelle
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

                // Ajouter la page actuelle à l'historique seulement si elle n'est pas déjà présente
                setHistory((prev) => {
                    if (!prev.includes(currentPage)) {
                        return [...prev, currentPage];
                    }
                    return prev;
                });
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
            </div>
            <div className="right-panel">
                {/* Cadre pour le nombre de pages objectifs réussies */}
                <div className="objective-frame">
                    <h2>Objectifs réussis</h2>
                    <div className="objective-box">
                        <p>{objectivesCompleted} objectifs atteints</p>
                        <p>{sitesToVisit} sites restants</p>
                    </div>
                </div>

                {/* Cadre pour les articles parcourus */}
                <div className="history-frame">
                    <h2>Articles parcourus</h2>
                    <div className="history-box">
                        {history.map((article, index) => (
                            <p key={index}>{article}</p>
                        ))}
                    </div>
                </div>

                {/* Cadre pour les artéfacts */}
                <div className="artifacts-frame">
                    <h2>Artéfacts</h2>
                    <div className="artifacts-box">
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SoloGame;