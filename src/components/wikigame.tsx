import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Ajouter useNavigate
import ChatMessage from './chat/ChatMessage';
import "./WikiGame.css";
import socket from '../services/socket';

// Ajouter ces types après les imports
type Artifact = {
    id: string;
    name: string;
    description: string;
    type: 'positive' | 'negative';
    effect: () => void;
    duration?: number;
    used?: boolean;
    icon: string;
};

type PlayerArtifacts = {
    [playerName: string]: {
        inventory: Artifact[];
        activeEffects: Artifact[];
    };
};

function WikiGame() {
    const navigate = useNavigate(); // Initialiser navigate
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

    // Ajouter ces états avec les états existants
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [playerArtifacts, setPlayerArtifacts] = useState<PlayerArtifacts>({});
    const [activeEffects, setActiveEffects] = useState<Artifact[]>([]);
    const [isSnailActive, setIsSnailActive] = useState(false);

    // États pour gérer le pop-up
    const [selectedPlayer, setSelectedPlayer] = useState<{ name: string, visitedArticles: string[] } | null>(null);
    const [showPopup, setShowPopup] = useState(false);

    const [chatMessages, setChatMessages] = useState<{ playerName: string; message: string; timestamp: string }[]>([]);
    
    // Ajouter un état pour gérer les erreurs
    const [error, setError] = useState<string | null>(null);

    // Ajouter un état pour la fin de partie
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState('');
    const [playerStats, setPlayerStats] = useState<{
        name: string;
        completedObjectives: number;
        isWinner: boolean;
        visitedPages: number;
    }[]>([]);

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
    const fetchWikiContent = useCallback(async (pageName: string, skipCheck = false) => {
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
            
            // Ne vérifier l'objectif que si skipCheck est false
            if (!skipCheck) {
                checkObjectiveCompletion(pageName);
            }
            
            return true;
        } catch (error) {
            setError(`Erreur: ${error instanceof Error ? error.message : "Problème inconnu"}`);
            return false;
        }
    }, []);
    
    // Cette fonction est déjà définie plus haut
    
    // Fonction pour acquérir un artefact
    const acquireArtifact = useCallback((artifact: Artifact) => {
        const playerName = localStorage.getItem("playerName") || "Anonymous";
        
        setPlayerArtifacts(prev => {
            const playerData = prev[playerName] || { inventory: [], activeEffects: [] };
            
            return {
                ...prev,
                [playerName]: {
                    ...playerData,
                    inventory: [...playerData.inventory, artifact],
                },
            };
        });
        
        // Notification
        alert(`Vous avez obtenu l'artefact: ${artifact.name} (${artifact.description})`);
    }, []);

    // Modifier la fonction checkObjectiveCompletion pour inclure l'acquisition d'artefacts
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
            
            // Chance d'obtenir un artefact (30% de chance)
            if (Math.random() < 0.3 && artifacts.length > 0) {
                // Filtrer uniquement les artefacts positifs
                const positiveArtifacts = artifacts.filter(a => a.type === 'positive');
                if (positiveArtifacts.length > 0) {
                    const randomIndex = Math.floor(Math.random() * positiveArtifacts.length);
                    const randomArtifact = positiveArtifacts[randomIndex];
                    acquireArtifact(randomArtifact);
                }
            }
        }
    }, [objectives, playerCompletedObjectives, partyCode, updateRemainingObjectives, artifacts, acquireArtifact]);

    // Ajouter cette fonction dans WikiGame
    const initializeArtifacts = useCallback(() => {
        const allArtifacts: Artifact[] = [
            {
                id: 'satellite',
                name: 'Satellite',
                description: 'Montre le chemin le plus court vers les articles cibles',
                type: 'positive',
                effect: () => activateGPS(),
                icon: '🛰️'
            },
            {
                id: 'rocket',
                name: 'Fusée',
                description: 'Retourne à l\'article précédent',
                type: 'positive',
                effect: () => goBack(),
                icon: '🚀'
            },
            {
                id: 'teleporter',
                name: 'Téléporteur',
                description: 'Se téléporte à 2 liens d\'un article cible',
                type: 'positive',
                effect: () => activateTeleporter(),
                icon: '🌀'
            },
            {
                id: 'meteorite',
                name: 'Météorite',
                description: 'Piège un article pour les autres joueurs',
                type: 'positive',
                effect: () => placeMine(),
                icon: '☄️'
            },
            {
                id: 'moonbase',
                name: 'Base Lunaire',
                description: 'Bloque le joueur sur une page pendant 1 minute',
                type: 'negative',
                effect: () => activateSnail(),
                duration: 60000,
                icon: '🏠'
            },
            {
                id: 'laser',
                name: 'Laser',
                description: 'Désintègre le dernier objectif atteint',
                type: 'negative',
                effect: () => activateEraser(),
                icon: '🔫'
            },
            {
                id: 'ufo',
                name: 'Ovni',
                description: 'Capture et téléporte aléatoirement sur Wikipédia',
                type: 'negative',
                effect: () => activateDisorienter(),
                icon: '🛸'
            },
            {
                id: 'alien',
                name: 'Alien',
                description: 'Impose de visiter un article spécifique',
                type: 'negative',
                effect: () => activateDictator(),
                icon: '👽'
            },
        ];

        setArtifacts(allArtifacts);
    }, []);

    // Ajouter ces fonctions dans WikiGame

    // GPS
    const activateGPS = () => {
        console.log('GPS activé - Chemin le plus court vers les objectifs');
        // Surlignez dans le contenu les liens qui mènent aux objectifs
        // Cette implémentation est simplifiée, en production cela nécessiterait
        // une analyse du contenu et un algorithme de recherche de chemin
        alert('Le GPS est activé ! Les liens vers vos objectifs sont surlignés en jaune.');
        
        const highlightLinks = () => {
            const content = document.querySelector('.wiki-content');
            if (!content) return;
            
            const links = content.querySelectorAll('a');
            links.forEach(link => {
                if (objectives.some(obj => obj.toLowerCase().includes(link.textContent!.toLowerCase()))) {
                    link.classList.add('gps-highlight');
                }
            });
        };
        
        setTimeout(highlightLinks, 500);
    };

    // Retour en arrière
    const goBack = () => {
        if (history.length > 1) {
            const previousPage = history[history.length - 2];
            setCurrentPage(previousPage);
            setHistory(prev => prev.slice(0, -1));
        } else {
            alert("Vous n'avez pas d'article précédent dans votre historique.");
        }
    };

    // Téléporteur
    const activateTeleporter = async () => {
        try {
            // Téléporte vers un article qui pourrait être proche d'un objectif
            // En pratique, nous prenons un article aléatoire pour simplifier
            const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
            const data = await response.json();
            const randomPage = data.items[0].title;
            setCurrentPage(randomPage);
            
            // Informer les autres joueurs du changement
            socket.emit("articleChanged", {
                playerName: localStorage.getItem("playerName") || "Anonymous",
                currentArticle: randomPage,
            });
            
            alert(`Téléportation vers: ${randomPage}`);
        } catch (error) {
            console.error("Erreur lors de la téléportation", error);
            alert("Téléportation échouée. Essayez à nouveau.");
        }
    };

    // Mine
    const placeMine = () => {
        if (!currentPage) return;
        
        // Marquer la page comme minée
        socket.emit('placeMine', {
            playerName: localStorage.getItem("playerName") || "Anonymous",
            minedArticle: currentPage,
            partyCode,
        });
        
        alert(`Mine placée sur ${currentPage}. Le prochain joueur qui visitera cette page perdra du temps!`);
    };

    // Escargot (Base Lunaire)
    const activateSnail = () => {
        setIsSnailActive(true);
        alert("Base Lunaire activée! Vous êtes bloqué sur cette page pendant 1 minute.");
        
        setTimeout(() => {
            setIsSnailActive(false);
            alert("Effet de la Base Lunaire terminé. Vous pouvez à nouveau naviguer.");
        }, 60000); // 1 minute
    };

    // Gomme (Laser)
    const activateEraser = () => {
        if (playerCompletedObjectives.length === 0) {
            alert("Aucun objectif complété à effacer.");
            return;
        }
        
        // Retirer le dernier objectif complété
        const newCompleted = [...playerCompletedObjectives];
        const removedObjective = newCompleted.pop();
        setPlayerCompletedObjectives(newCompleted);
        
        // Informer le serveur
        const playerName = localStorage.getItem("playerName") || "Anonymous";
        socket.emit('objectiveErased', {
            partyCode,
            playerName,
            removedObjective,
        });
        
        alert(`L'objectif "${removedObjective}" a été désintégré par le laser!`);
    };

    // Désorienteur (Ovni)
    const activateDisorienter = async () => {
        try {
            const response = await fetch("https://fr.wikipedia.org/api/rest_v1/page/random/title");
            const data = await response.json();
            const randomPage = data.items[0].title;
            
            setCurrentPage(randomPage);
            socket.emit("articleChanged", {
                playerName: localStorage.getItem("playerName") || "Anonymous",
                currentArticle: randomPage,
            });
            
            alert(`Vous avez été capturé par un OVNI et déposé sur: ${randomPage}`);
        } catch (error) {
            console.error("Erreur lors de la désorientation", error);
        }
    };

    // Dictateur (Alien)
    const activateDictator = () => {
        // Choisir un objectif restant aléatoire
        if (remainingObjectives.length > 0) {
            const randomIndex = Math.floor(Math.random() * remainingObjectives.length);
            const forcedPage = remainingObjectives[randomIndex];
            
            alert(`Un alien vous impose de visiter: ${forcedPage}`);
            
            // Créer une animation qui guide le joueur vers cet objectif
            const contentDiv = document.querySelector('.wiki-content');
            if (contentDiv) {
                const alienOverlay = document.createElement('div');
                alienOverlay.className = 'alien-overlay';
                alienOverlay.innerHTML = `<p>👽 Allez à: ${forcedPage}</p>`;
                contentDiv.appendChild(alienOverlay);
                
                setTimeout(() => {
                    contentDiv.removeChild(alienOverlay);
                }, 5000);
            }
        } else {
            alert("Les aliens n'ont pas d'objectif à vous imposer!");
        }
    };

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
                                const success = await fetchWikiContent(startPage, true);
                                
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
                    
                    const success = await fetchWikiContent(startPage, true);
                    
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

        // Nouveaux écouteurs pour mise à jour conditionnelle
        socket.on('playerJoined', ({ playerName }: { playerName: string }) => {
            console.log(`Nouveau joueur: ${playerName}`);
            // Ajouter le joueur à la liste sans rechargement complet
            setPlayers(prev => {
                if (prev.some(p => p.name === playerName)) return prev;
                return [...prev, { name: playerName, currentArticle: "", objectiveCount: 0 }];
            });
        });
        
        socket.on('playerLeft', ({ playerName }: { playerName: string }) => {
            console.log(`Joueur parti: ${playerName}`);
            // Supprimer le joueur sans rechargement complet
            setPlayers(prev => prev.filter(p => p.name !== playerName));
        });
        
        socket.on('partyUpdated', () => {
            console.log("Mise à jour importante de la partie détectée, rechargement des données");
            fetchPartyData();
        });

        // Écouteur pour la fin de partie
        socket.on('gameOver', ({ 
            winner, 
            playerStats 
        }: { 
            winner: string; 
            playerStats: {
                name: string;
                completedObjectives: number;
                isWinner: boolean;
                visitedPages: number;
            }[]
        }) => {
            console.log('Partie terminée! Gagnant:', winner);
            console.log('Statistiques:', playerStats);
            
            setWinner(winner);
            setPlayerStats(playerStats);
            setGameOver(true);
        });
        
        // Écouteur pour le redémarrage de partie
        socket.on('gameRestarted', ({ newPartyCode }: { newPartyCode: string }) => {
            console.log(`Partie redémarrée avec le code: ${newPartyCode}`);
            navigate(`/lobby/${newPartyCode}`);
        });
        
        // Nettoyage des écouteurs
        return () => {
            socket.off('objectivesGenerated');
            socket.off('receiveMessage');
            socket.off('articleChanged');
            socket.off('objectiveProgress');
            socket.off('disconnect');
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('partyUpdated');
            socket.off('gameOver');
            socket.off('gameRestarted');
        };
    }, [partyCode, fetchPartyData, fetchWikiContent, objectives, updateRemainingObjectives]);

    // La fonction acquireArtifact est déjà définie plus haut, avant checkObjectiveCompletion
    
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

    const handleQuitGame = () => {
        navigate('/');
    };

    const handleRestartGame = () => {
        if (partyCode) {
            // Émettre l'événement pour redémarrer la partie
            socket.emit('restartGame', { oldPartyCode: partyCode });
        }
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
                                    // Si l'effet escargot est actif, bloquer la navigation
                                    if (isSnailActive) {
                                        alert("Vous êtes bloqué par la Base Lunaire! Attendez la fin de l'effet.");
                                        e.preventDefault();
                                        return;
                                    }
                                    
                                    const target = e.target as HTMLAnchorElement;
                                    if (target.tagName === "A") {
                                        e.preventDefault();
                                        const newPage = target.innerText;
                                        setCurrentPage(newPage);
                                        socket.emit("articleChanged", {
                                            playerName: localStorage.getItem("playerName") || "Anonymous",
                                            currentArticle: newPage,
                                        });
                                        
                                        // Chance de déclencher un artefact négatif (20% de chance)
                                        if (Math.random() < 0.2 && artifacts.length > 0) {
                                            // Filtrer uniquement les artefacts négatifs
                                            const negativeArtifacts = artifacts.filter(a => a.type === 'negative');
                                            if (negativeArtifacts.length > 0) {
                                                const randomIndex = Math.floor(Math.random() * negativeArtifacts.length);
                                                const randomArtifact = negativeArtifacts[randomIndex];
                                                
                                                // Délai pour que l'artefact ne se déclenche pas immédiatement
                                                setTimeout(() => {
                                                    randomArtifact.effect();
                                                    alert(`Oh non! Vous avez déclenché l'artefact: ${randomArtifact.name}`);
                                                }, 1000);
                                            }
                                        }
                                    }
                                }}
                            ></div>
                        </div>

                        <div className="artifacts-bar">
                            <h2>Artefacts</h2>
                            <div className="artifacts-list">
                                {playerArtifacts[localStorage.getItem("playerName") || "Anonymous"]?.inventory.map((artifact, index) => (
                                    <div
                                        key={index}
                                        className={`artifact ${artifact.type}`}
                                        title={artifact.description}
                                        onClick={() => {
                                            artifact.effect();
                                            
                                            // Supprimer l'artefact de l'inventaire après utilisation (sauf GPS)
                                            if (artifact.id !== 'satellite') {
                                                setPlayerArtifacts(prev => {
                                                    const playerName = localStorage.getItem("playerName") || "Anonymous";
                                                    const playerData = prev[playerName];
                                                    if (!playerData) return prev;
                                                    
                                                    return {
                                                        ...prev,
                                                        [playerName]: {
                                                            ...playerData,
                                                            inventory: playerData.inventory.filter((_, i) => i !== index),
                                                        },
                                                    };
                                                });
                                            }
                                        }}
                                    >
                                        <span className="artifact-icon">{artifact.icon}</span>
                                        <span className="artifact-name">{artifact.name}</span>
                                    </div>
                                )) || []}
                            </div>
                            {activeEffects.length > 0 && (
                                <div className="active-effects">
                                    <h3>Effets actifs:</h3>
                                    {activeEffects.map((effect, index) => (
                                        <div key={index} className="active-effect">
                                            <span className="effect-icon">{effect.icon}</span>
                                            <span className="effect-name">{effect.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isSnailActive && (
                                <div className="snail-effect">
                                    <span className="effect-icon">🏠</span>
                                    <span className="effect-name">Base Lunaire active</span>
                                </div>
                            )}
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

                    {/* Overlay de fin de partie */}
                    {gameOver && (
                        <div className="game-over-overlay">
                            <div className="game-over-content">
                                <h1>Partie terminée!</h1>
                                <h2>{winner} a gagné!</h2>
                                
                                <div className="podium">
                                    <h3>Podium</h3>
                                    <div className="podium-players">
                                        {playerStats.map((player, index) => (
                                            <div 
                                                key={player.name} 
                                                className={`podium-player ${player.isWinner ? 'winner' : ''} rank-${index + 1}`}
                                            >
                                                <span className="podium-rank">{index + 1}</span>
                                                <span className="podium-name">{player.name}</span>
                                                <div className="podium-stats">
                                                    <div className="stat">
                                                        <span className="stat-label">Objectifs:</span>
                                                        <span className="stat-value">{player.completedObjectives}</span>
                                                    </div>
                                                    <div className="stat">
                                                        <span className="stat-label">Pages visitées:</span>
                                                        <span className="stat-value">{player.visitedPages}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="game-over-actions">
                                    <button 
                                        onClick={handleQuitGame}
                                        className="quit-button"
                                    >
                                        Quitter
                                    </button>
                                    <button 
                                        onClick={handleRestartGame}
                                        className="restart-button"
                                    >
                                        Recommencer
                                    </button>
                                </div>
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