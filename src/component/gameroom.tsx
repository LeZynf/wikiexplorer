
import WikiGame from "./wikigame";


function GameRoom() {
  return (
    <div className="GameContainer">
        <h1 className="Title">WikiExplorer</h1>
    
        <div>
            <WikiGame />
        </div>

        <div className="ChatBox"> </div>

        <div className="PlayerContainer">

        </div>


        <div    className="inventory"></div>
    </div>
  );
}

export default GameRoom;