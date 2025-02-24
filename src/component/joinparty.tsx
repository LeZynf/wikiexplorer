

import './joinparty.css';

function JoinParty() {
  return (

    <div>
       <h1 className="GameName">WikiExplorer</h1>
<div className="table-container">
    <table >
    
        <tr>
          <td>
            <label htmlFor="PartyCode" className='partycode'>Party Code</label>
          </td>
        </tr>
        <tr>
        <td>
            <input id='PartyCode' className='partynumber' type="text" placeholder="000000" pattern="\d{6}" title="Please enter a 6 digit code" maxLength={6} />
        </td>    </tr>
        <tr>
          <td>
            <button>Join</button>
          </td>
        </tr>
    </table>
    </div>
    </div>
  );    

}

export default JoinParty;