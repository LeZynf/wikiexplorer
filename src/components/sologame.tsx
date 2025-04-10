import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Ajout pour la navigation
import "./sologame.css";

function SoloGame() {
    const navigate = useNavigate(); // Pour la navigation
    const [currentPage, setCurrentPage] = useState("");
    const [targetPage, setTargetPage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [content, setContent] = useState("");
    const [objectivesCompleted, setObjectivesCompleted] = useState(0);
    const [sitesToVisit, setSitesToVisit] = useState(1);
    const [showVictoryOverlay, setShowVictoryOverlay] = useState(false); // Nouvel état pour l'overlay de victoire
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [completionTime, setCompletionTime] = useState<number>(0); // Temps en secondes

    // Ajouter ces états au début du composant SoloGame
    const [bestRecord, setBestRecord] = useState<{time: number, date: string, articlesVisited: number} | null>(null);
    const [isNewRecord, setIsNewRecord] = useState(false);

    // Ajouter cette fonction utilitaire pour formater le temps (mm:ss)
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Ajouter cette fonction après les autres fonctions utilitaires
    const checkAndUpdateRecord = (target: string, newTime: number, articlesVisited: number) => {
        // Structure pour stocker les records par cible
        const recordsMap = JSON.parse(localStorage.getItem('wikiExplorerRecords') || '{}');
        
        // Vérifier si c'est un nouveau record ou non
        const currentRecord = recordsMap[target];
        let recordBeaten = false;
        
        if (!currentRecord || newTime < currentRecord.time) {
            // Nouveau record!
            recordsMap[target] = {
                time: newTime,
                date: new Date().toISOString(),
                articlesVisited: articlesVisited
            };
            
            // Enregistrer le nouveau record
            localStorage.setItem('wikiExplorerRecords', JSON.stringify(recordsMap));
            recordBeaten = true;
            
            // Mettre à jour l'état pour l'UI
            setBestRecord(recordsMap[target]);
            setIsNewRecord(true);
        } else {
            // Pas de nouveau record, mais on affiche quand même le record actuel
            setBestRecord(currentRecord);
            setIsNewRecord(false);
        }
        
        return recordBeaten;
    };

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

    // Modifier la fonction initGame pour charger le record existant
    const initGame = async () => {
        const startPage = await fetchRandomPage();
        const newTargetPage = "Gustave_Eiffel"; // Pour les tests, page fixe
        if (startPage && newTargetPage) {
            setCurrentPage(startPage);
            setTargetPage(newTargetPage);
            setHistory([startPage]);
            setCurrentIndex(0);
            
            // Enregistrer l'heure de départ
            const now = new Date();
            setStartTime(now);
            
            // Charger le record existant pour cette cible
            const recordsMap = JSON.parse(localStorage.getItem('wikiExplorerRecords') || '{}');
            const existingRecord = recordsMap[newTargetPage];
            if (existingRecord) {
                setBestRecord(existingRecord);
            } else {
                setBestRecord(null);
            }
            setIsNewRecord(false);
            
            console.log("Début de la partie:", now);
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

    // Modifier handleObjectiveCompletion pour vérifier si c'est un nouveau record
    const handleObjectiveCompletion = () => {
        if (currentPage === targetPage && startTime) {
            const endTime = new Date();
            const timeDiff = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
            
            setCompletionTime(timeDiff);
            setObjectivesCompleted((prev) => prev + 1);
            setSitesToVisit((prev) => Math.max(0, prev - 1));
            
            // Enregistrer l'historique complet
            const bestTimes = JSON.parse(localStorage.getItem('wikiExplorerBestTimes') || '[]');
            bestTimes.push({
                target: targetPage,
                time: timeDiff,
                date: new Date().toISOString(),
                articlesVisited: history.length
            });
            localStorage.setItem('wikiExplorerBestTimes', JSON.stringify(bestTimes));
            
            // Vérifier si c'est un nouveau record
            checkAndUpdateRecord(targetPage, timeDiff, history.length);
            
            // Afficher l'overlay de victoire
            setShowVictoryOverlay(true);
        }
    };

    const handleRestartGame = () => {
        setShowVictoryOverlay(false);
        initGame();
    };

    const handleReturnToHome = () => {
        navigate('/');
    };

    return (
        <div className="wiki-game">
            <div className="left-panel">
                <div className="wiki-frame">
                    <h1>WikiExplorer</h1>
                    <h2 className="blanc">Objectif : {targetPage}</h2>
                    <div className="navigation-buttons">
                        <button onClick={goBack} disabled={currentIndex <= 0}>⬅️ Précédent</button>
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
                    <h2 className="blanc">Objectifs réussis</h2>
                    <div className="objective-box">
                        <p>{objectivesCompleted} objectifs atteints</p>
                        <p>{sitesToVisit} sites restants</p>
                    </div>
                </div>

                <div className="history-frame">
                    <h2 className="blanc">Articles parcourus</h2>
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
                    <h2 className="blanc">Artéfacts</h2>
                    <div className="artifacts-box"></div>
                </div>
            </div>

            {showVictoryOverlay && (
                <div className="victory-overlay">
                    <div className="victory-content">
                        <h1>Partie gagnée!</h1>
                        <h2>Vous avez trouvé {targetPage}!</h2>
                        
                        {/* Affichage du temps de complétion */}
                        <div className="completion-time">
                            <h3>Temps: {formatTime(completionTime)}</h3>
                            {isNewRecord && <div className="new-record">NOUVEAU RECORD !</div>}
                        </div>
                        
                        {/* Afficher le record précédent si ce n'est pas un nouveau record */}
                        {!isNewRecord && bestRecord && (
                            <div className="previous-record">
                                <p>Record à battre: {formatTime(bestRecord.time)}</p>
                                <p>Établi le: {new Date(bestRecord.date).toLocaleDateString()}</p>
                            </div>
                        )}
                        
                        <p>Objectifs complétés: {objectivesCompleted}</p>
                        <p>Articles visités: {history.length}</p>
                        
                        <div className="victory-actions">
                            <button 
                                className="restart-button"
                                onClick={handleRestartGame}
                            >
                                Nouvelle partie
                            </button>
                            <button 
                                className="home-button"
                                onClick={handleReturnToHome}
                            >
                                Retour à l'accueil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SoloGame;
