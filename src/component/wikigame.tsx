import { useState, useEffect } from "react";
import "./WikiGame.css";
import { useParams } from "react-router-dom";

function WikiGame() {
    const [currentPage, setCurrentPage] = useState("");
    const [targetPage, setTargetPage] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [players, setPlayers] = useState<{ name: string, currentArticle: string, objectiveCount: number }[]>([]);
    const [objectivesCompleted, setObjectivesCompleted] = useState(0);
    const [sitesToVisit, setSitesToVisit] = useState(5); // Valeur par défaut, à récupérer depuis le lobby
    const { partyCode } = useParams<{ partyCode: string }>();

    // États pour gérer le pop-up
    const [selectedPlayer, setSelectedPlayer] = useState<{ name: string, visitedArticles: string[] } | null>(null);
    const [showPopup, setShowPopup] = useState(false);

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

    // Récupérer les joueurs depuis le lobby
    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const response = await fetch(`http://localhost:5000/party/${partyCode}`);
                const data = await response.json();

                if (data.success) {
                    // Transformer les joueurs en objets avec les propriétés nécessaires
                    const transformedPlayers = data.party.players.map((player: string) => ({
                        name: player,
                        currentArticle: "En attente...", // Valeur par défaut
                        objectiveCount: 0, // Valeur par défaut
                    }));
                    setPlayers(transformedPlayers);

                    // Récupérer le nombre d'objectifs depuis le lobby
                    setSitesToVisit(data.party.settings.sitesToVisit);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des joueurs", error);
            }
        };

        fetchPlayers();
    }, [partyCode]);

    // Vérifier si la page actuelle correspond à l'objectif
    useEffect(() => {
        if (!currentPage || !targetPage) return;

        if (currentPage === targetPage) {
            // Objectif atteint
            setObjectivesCompleted((prev) => prev + 1);

            // Mettre à jour le compteur d'objectifs pour le joueur actuel
            setPlayers((prevPlayers) =>
                prevPlayers.map((player) =>
                    player.name === "Pepito" // Remplacez "Pepito" par le joueur actuel
                        ? { ...player, objectiveCount: player.objectiveCount + 1 }
                        : player
                )
            );

            // Changer l'objectif si le nombre d'objectifs n'est pas encore atteint
            if (objectivesCompleted < sitesToVisit - 1) {
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
    }, [currentPage, targetPage, objectivesCompleted, sitesToVisit]);

    const handlePlayerClick = (playerName: string) => {
        // Récupérer les articles visités par le joueur (en utilisant l'historique)
        const visitedArticles = history;
        setSelectedPlayer({
            name: playerName,
            visitedArticles: visitedArticles,
        });

        setShowPopup(true);
    };

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
                        <p>Objectifs atteints : {objectivesCompleted}/{sitesToVisit}</p>
                    </div>
                </div>
            </div>
            <div className="right-panel">
                <div className="code-frame">
                    <h2>Code</h2>
                    <div className="code-box">
                        <p>{partyCode}</p>
                    </div>
                </div>
                <div className="player-frame">
                    <h2>Joueurs</h2>
                    <div className="players-list">
                        {players.map((player, index) => (
                            <div className="player" key={index} onClick={() => handlePlayerClick(player.name)}>
                                <div className="player-info">
                                    <span className="objective-count">{player.objectiveCount}</span>
                                    <span className="player-name">{player.name}</span>
                                </div>
                                <div className="current-article">{player.currentArticle}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="chat-frame">
                    <h2>Chat</h2>
                    <div className="chat-box">
                    </div>
                </div>
            </div>

            {/* Pop-up pour afficher les articles visités par un joueur */}
            {showPopup && selectedPlayer && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <h2>Articles visités par {selectedPlayer.name}</h2>
                        <ul>
                            {selectedPlayer.visitedArticles.map((article, index) => (
                                <li key={index}>{article}</li>
                            ))}
                        </ul>
                        <button onClick={() => setShowPopup(false)}>Fermer</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WikiGame;