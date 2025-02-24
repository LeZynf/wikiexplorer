import  { useState, useEffect } from "react";

function WikiGame() {
  const [currentPage, setCurrentPage] = useState("");
  const [targetPage, setTargetPage] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  // Charger une page aléatoire au début
  useEffect(() => {
    const fetchRandomPage = async () => {
      try {
        const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/title");
        const data = await response.json();
        setCurrentPage(data.items[0].title);

        // Définir une page cible différente
        const responseTarget = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/title");
        const dataTarget = await responseTarget.json();
        setTargetPage(dataTarget.items[0].title);
      } catch (error) {
        console.error("Erreur lors du chargement de la page aléatoire", error);
      }
    };

    fetchRandomPage();
  }, []);

  // Charger le contenu de la page actuelle
  const [content, setContent] = useState("");

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
        setHistory((prev) => [...prev, currentPage]); // Ajouter à l'historique
      } catch (error) {
        console.error(error);
      }
    };

    fetchWikiContent();
  }, [currentPage]);

  return (
    <div>
      <h1>WikiExplorer</h1>
      <h2>Objectif : {targetPage}</h2>
      <div
        className="wiki-content"
        dangerouslySetInnerHTML={{ __html: content }}
        onClick={(e) => {
          const target = e.target as HTMLAnchorElement;
          if (target.tagName === "A") {
            e.preventDefault();
            const newPage = (e.target as HTMLAnchorElement).innerText;
            setCurrentPage(newPage);
          }
        }}
      ></div>

      <h3>Historique :</h3>
      <ul>
        {history.map((page, index) => (
          <li key={index}>{page}</li>
        ))}
      </ul>
    </div>
  );
}

export default WikiGame;
