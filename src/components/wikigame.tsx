import { useState, useEffect, useCallback } from "react";
import ChatMessage from './chat/ChatMessage';
import "./WikiGame.css";
import { useParams } from "react-router-dom";
import socket from '../services/socket';

function WikiGame() {
    const [currentPage, setCurrentPage] = useState("");
    const [remainingObjectives, setRemainingObjectives] = useState<string[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [players, setPlayers] = useState<{ name: string, currentArticle: string, objectiveCount: number }[]>([]);
    const [sitesToVisit, setSitesToVisit] = useState(5); // Valeur par défaut, à récupérer depuis le lobby
    const { partyCode } = useParams<{ partyCode: string }>();
    const [objectives, setObjectives] = useState<string[]>([]);
    const [playerCompletedObjectives, setPlayerCompletedObjectives] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [initStep, setInitStep] = useState('loading'); // 'loading', 'objectives', 'ready'

    // États pour gérer le pop-up
    const [selectedPlayer, setSelectedPlayer] = useState<{ name: string, visitedArticles: string[] } | null>(null);
    const [showPopup, setShowPopup] = useState(false);

    const [chatMessages, setChatMessages] = useState<{ playerName: string; message: string; timestamp: string }[]>([]);
    
    // Ajouter un état pour gérer les erreurs
    const [error, setError] = useState<string | null>(null);

    // ================ FONCTIONS UTILITAIRES CENTRALISÉES ================
    
    // Fonction centralisée pour récupérer les données de la partie
    const fetchPartyData = useCallback(async () => {
        if (!partyCode) return;
        
        try {
            console.log("Récupération des données de la partie...");
            const response = await fetch(`http://localhost:5000/party/${partyCode}`);
            const data = await response.json();
            
            if (data.success) {
                console.log("Données récupérées:", data.party);
                
                // Mise à jour des paramètres de jeu
                setSitesToVisit(data.party.settings.sitesToVisit);
                setObjectives(data.party.objectives || []);
                
                // Récupérer les joueurs avec leur progression
                const playerName = localStorage.getItem('playerName') || 'Anonymous';
                const playerCompleted = data.party.completedArticles?.[playerName] || [];
                
                // Mettre à jour les joueurs
                const transformedPlayers = data.party.players.map((player: string) => {
                    const completedCount = 
                        data.party.completedArticles?.[player]?.length || 0;
                    
                    return {
                        name: player,
                        currentArticle: "", // Sera mis à jour par les événements Socket
                        objectiveCount: completedCount
                    };
                });
                
                setPlayers(transformedPlayers);
                setPlayerCompletedObjectives(playerCompleted);
                
                // Mettre à jour les objectifs restants
                updateRemainingObjectives(data.party.objectives || [], playerCompleted);
                
                return data.party;
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
            return null;
        }
    }, [partyCode]);
    
    // Fonction pour mettre à jour les objectifs restants
    const updateRemainingObjectives = useCallback((allObjectives: string[], completed: string[]) => {
        setRemainingObjectives(allObjectives.filter(obj => !completed.includes(obj)));
    }, []);
    
    // Fonction améliorée pour charger le contenu Wikipedia
    const fetchWikiContent = useCallback(async (pageName: string) => {
        try {
            console.log("Chargement du contenu pour:", pageName);
            
            if (!pageName) {
                setError("Nom de page invalide");
                return false;
            }
            
            const encodedPageName = encodeURIComponent(pageName.replace(/\s+/g, '_'));
            const response = await fetch(
                `https://fr.wikipedia.org/api/rest_v1/page/html/${encodedPageName}`
            );
            
            if (!response.ok) {
                setError(`Erreur lors du chargement de la page: ${response.status}`);
                return false;
            }
            
            const htmlContent = await response.text();
            
            if (!htmlContent || htmlContent.trim() === "") {
                setError("Contenu vide reçu de Wikipedia");
                return false;
            }
            
            setContent(htmlContent);
            setError(null);

            // Ajouter à l'historique
            setHistory((prev) => {
                if (!prev.includes(pageName)) {
                    return [...prev, pageName];
                }
                return prev;
            });
            
            // Vérifier si c'est un objectif
            checkObjectiveCompletion(pageName);
            
            return true;
        } catch (error) {
            setError(`Erreur: ${error instanceof Error ? error.message : "Problème inconnu"}`);
            return false;
        }
    }, []);
    
    // Fonction pour vérifier si une page est un objectif
    const checkObjectiveCompletion = useCallback((page: string) => {
        if (!page || !objectives.length) return;
        
        if (objectives.includes(page) && !playerCompletedObjectives.includes(page)) {
            const playerName = localStorage.getItem('playerName') || 'Anonymous';
            
            // Mettre à jour localement
            const newCompleted = [...playerCompletedObjectives, page];
            setPlayerCompletedObjectives(newCompleted);
            
            // Notifier le serveur
            socket.emit('objectiveCompleted', {
                partyCode,
                playerName,
                article: page
            });
            
            // Mettre à jour les objectifs restants
            updateRemainingObjectives(objectives, newCompleted);
        }
    }, [objectives, playerCompletedObjectives, partyCode, updateRemainingObjectives]);

    // ================ EFFETS CENTRALISÉS ================
    
    // 1. Effet d'initialisation - exécuté une seule fois au montage
    useEffect(() => {
        if (!partyCode) return;
        
        const initializeGame = async () => {
            setIsLoading(true);
            setInitStep('loading');
            
            try {
                const partyData = await fetchPartyData();
                
                if (partyData) {
                    // Si les objectifs existent, les afficher
                    if (partyData.objectives && partyData.objectives.length > 0) {
                        setInitStep('objectives');
                        
                        // Après un délai, charger la page de départ
                        setTimeout(async () => {
                            try {
                                const playerName = localStorage.getItem('playerName') || 'Anonymous';
                                const playerCompleted = partyData.completedArticles?.[playerName] || [];
                                
                                // Choisir une page de départ (un objectif aléatoire)
                                const randomIndex = Math.floor(Math.random() * partyData.objectives.length);
                                const startPage = partyData.objectives[randomIndex];
                                
                                setCurrentPage(startPage);
                                
                                // Charger le contenu
                                const success = await fetchWikiContent(startPage);
                                
                                // Si c'est un nouvel objectif, le marquer comme complété
                                if (success && !playerCompleted.includes(startPage)) {
                                    socket.emit('objectiveCompleted', {
                                        partyCode,
                                        playerName,
                                        article: startPage
                                    });
                                }
                            } finally {
                                setInitStep('ready');
                                setIsLoading(false);
                            }
                        }, 3000);
                    } else {
                        // Demander de générer des objectifs
                        socket.emit('initializeGame', { partyCode });
                    }
                }
            } catch (error) {
                console.error("Erreur d'initialisation:", error);
                setIsLoading(false);
            }
        };
        
        initializeGame();
    }, [partyCode, fetchPartyData, fetchWikiContent]);
    
    // 2. Effet pour gérer les changements de page
    useEffect(() => {
        if (!currentPage) return;
        
        let attempts = 0;
        const maxAttempts = 3;
        
        const loadContent = async () => {
            setIsLoading(true);
            const success = await fetchWikiContent(currentPage);
            
            if (!success && attempts < maxAttempts) {
                attempts++;
                setTimeout(loadContent, 1000);
            } else {
                setIsLoading(false);
            }
        };
        
        loadContent();
    }, [currentPage, fetchWikiContent]);
    
    // 3. Un seul effet pour configurer tous les écouteurs socket
    useEffect(() => {
        // Écouteur pour les objectifs générés
        socket.on('objectivesGenerated', ({ objectives }: { objectives: string[] }) => {
            console.log("Objectifs reçus:", objectives);
            setObjectives(objectives);
            setInitStep('objectives');
            
            const playerName = localStorage.getItem('playerName') || 'Anonymous';
            
            setTimeout(async () => {
                try {
                    const randomIndex = Math.floor(Math.random() * objectives.length);
                    const startPage = objectives[randomIndex];
                    setCurrentPage(startPage);
                    
                    const success = await fetchWikiContent(startPage);
                    
                    if (success) {
                        setPlayerCompletedObjectives([startPage]);
                        socket.emit('objectiveCompleted', {
                            partyCode,
                            playerName,
                            article: startPage
                        });
                    }
                } finally {
                    setInitStep('ready');
                    setIsLoading(false);
                }
            }, 3000);
        });

        // Écouteur pour les messages de chat
        socket.on('receiveMessage', (message: { playerName: string; message: string; timestamp: string }) => {
            setChatMessages((prevMessages) => [...prevMessages, message]);
        });
        
        // Écouteur pour les changements d'article
        socket.on("articleChanged", ({ playerName, currentArticle }: { playerName: string; currentArticle: string }) => {
            console.log(`${playerName} a changé d'article: ${currentArticle}`);
            
            setPlayers(prevPlayers => {
                const playerExists = prevPlayers.some(p => p.name === playerName);
                
                if (playerExists) {
                    return prevPlayers.map(player => 
                        player.name === playerName ? { ...player, currentArticle } : player
                    );
                } else {
                    return [...prevPlayers, { name: playerName, currentArticle, objectiveCount: 0 }];
                }
            });
        });
        
        // Écouteur pour les progrès d'objectifs
        socket.on('objectiveProgress', ({ playerName, completedArticles }: {
            playerName: string;
            completedArticles: string[];
            totalObjectives: number;
        }) => {
            setPlayers(prevPlayers => 
                prevPlayers.map(player => 
                    player.name === playerName ? 
                    { ...player, objectiveCount: completedArticles.length } : 
                    player
                )
            );
            
            const currentPlayerName = localStorage.getItem('playerName') || 'Anonymous';
            if (playerName === currentPlayerName) {
                setPlayerCompletedObjectives(completedArticles);
                updateRemainingObjectives(objectives, completedArticles);
            }
        });
        
        // Écouteur pour les déconnexions
        socket.on("disconnect", () => {
            console.log("Déconnecté du serveur");
            setIsLoading(true);
        });
        
        // Nettoyage des écouteurs
        return () => {
            socket.off('objectivesGenerated');
            socket.off('receiveMessage');
            socket.off('articleChanged');
            socket.off('objectiveProgress');
            socket.off('disconnect');
        };
    }, [fetchWikiContent, objectives, partyCode, updateRemainingObjectives]);
    
    // 4. Rafraîchissement périodique des données
    useEffect(() => {
        if (!partyCode) return;
        
        const intervalId = setInterval(fetchPartyData, 5000);
        return () => clearInterval(intervalId);
    }, [partyCode, fetchPartyData]);
    
    // ================ GESTIONNAIRES D'ÉVÉNEMENTS ================
    
    const handleSendMessage = (message: string) => {
        const chatMessage = {
            playerName: localStorage.getItem('playerName') || 'Anonymous',
            message,
            timestamp: new Date().toISOString(),
        };
        socket.emit('sendMessage', chatMessage);
    };
    
    const handlePlayerClick = (playerName: string) => {
        setSelectedPlayer({
            name: playerName,
            visitedArticles: history,
        });
        setShowPopup(true);
    };
    
    // Calcul dérivé pour le nombre d'objectifs complétés
    const objectivesCompleted = playerCompletedObjectives.length;

    return (
        <div className="wiki-game">
            {isLoading ? (
                <div className="loading-state">
                    {initStep === 'loading' ? (
                        <div className="loading-indicator">
                            <h2>Chargement du jeu...</h2>
                            <p>Récupération des données de la partie</p>
                            <div className="spinner"></div>
                        </div>
                    ) : initStep === 'objectives' ? (
                        <div className="objectives-preview">
                            <h2>Objectifs de la partie</h2>
                            <p>Vous devez visiter ces pages Wikipedia:</p>
                            <div className="objectives-list">
                                {objectives.map((obj, index) => {
                                    const isCompleted = playerCompletedObjectives.includes(obj);
                                    return (
                                        <div 
                                            key={index} 
                                            className={`objective-item ${isCompleted ? 'completed' : 'not-completed'}`}
                                        >
                                            <span className="objective-icon">
                                                {isCompleted ? '✅' : '🔍'}
                                            </span>
                                            <span className="objective-text">{obj}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p>Préparation de votre page de départ...</p>
                        </div>
                    ) : null}
                </div>
            ) : error && !content ? (
                // État d'erreur amélioré
                <div className="error-state">
                    <h2>Impossible de charger le contenu</h2>
                    <p className="error-message">{error}</p>
                    <div className="error-actions">
                        <button 
                            onClick={() => {
                                setIsLoading(true);
                                fetchWikiContent(currentPage).finally(() => setIsLoading(false));
                            }}
                            className="retry-button"
                        >
                            Réessayer
                        </button>
                        <button
                            onClick={() => {
                                // Tenter avec une autre page aléatoire parmi les objectifs
                                if (objectives.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * objectives.length);
                                    setCurrentPage(objectives[randomIndex]);
                                }
                            }}
                            className="alternate-button"
                        >
                            Essayer une autre page
                        </button>
                    </div>
                </div>
            ) : content ? (
                // Contenu du jeu existant ;
                <>
                    <div className="left-panel">
                        <div className="wiki-frame">
                            <h1>WikiExplorer &emsp; {partyCode}</h1>
                        
                           
                            <p>Progression : {objectivesCompleted}/{sitesToVisit}</p>
                            <div
                                className="wiki-content"
                                dangerouslySetInnerHTML={{ __html: content }}
                                onClick={(e) => {
                                    const target = e.target as HTMLAnchorElement;
                                    if (target.tagName === "A") {
                                        e.preventDefault();
                                        const newPage = target.innerText;
                                        setCurrentPage(newPage);
                                        socket.emit("articleChanged", {
                                            playerName: localStorage.getItem("playerName") || "Anonymous",
                                            currentArticle: newPage,
                                        });
                                    }
                                }}
                            ></div>
                        </div>

                        <div className="artifacts-bar">
                            <h2>Artéfacts</h2>
                        </div>
                    </div>

                    <div className="right-panel">
                        {/* Corriger la structure du panneau droit */}
                        <div className="code-frame">
                             <div className="objectives-status">
                                {objectives.map(obj => (
                                    <span 
                                        key={obj} 
                                        className={`objective-item ${playerCompletedObjectives.includes(obj) ? 'completed' : 'not-completed'}`}
                                    >
                                        {playerCompletedObjectives.includes(obj) ? '✅ ' : '❌ '}
                                        {obj}
                                    </span>
                                ))}
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
                        <div className="current-article">{player.currentArticle || "Aucun article"}</div>
                        </div>
                    ))}
                    </div>
                        </div>
                        <div className="chatlob border-b">
  <div className="chat">
    {chatMessages.map((msg, index) => (
      <ChatMessage key={index} username={msg.playerName} message={msg.message} timestamp={msg.timestamp} />
    ))}
  </div>
  <div className="chat-input-container">
    <input
      type="text"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const input = e.target as HTMLInputElement;
          const message = input.value.trim();
          if (message !== '') {
            handleSendMessage(message);
            input.value = '';
          }
        }
      }}
      placeholder="Type your message..."
      className="chat-input"
    />
    <button
      onClick={() => {
        const input = document.querySelector('.chat-input') as HTMLInputElement;
        const message = input.value.trim();
        if (message !== '') {
          handleSendMessage(message);
          input.value = '';
        }
      }}
      className="chat-send-button"
    >
      Send
    </button>
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
                </>
            ) : (
                // État par défaut quand il n'y a ni contenu ni erreur spécifique
                <div className="error-state">
                    <h2>Impossible de charger le contenu</h2>
                    <p>Une erreur inattendue s'est produite</p>
                    <button 
                        onClick={() => {
                            setIsLoading(true);
                            window.location.reload();
                        }}
                        className="retry-button"
                    >
                        Recharger la page
                    </button>
                </div>
            )}
        </div>
    );
}

export default WikiGame;