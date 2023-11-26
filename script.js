const { HexabaseClient } = hexabase;
const client = new HexabaseClient();

const API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjI2NDY1NDE0OTUsImlhdCI6MTcwMDQ2MTQ5NSwic3ViIjoiNjJiYWMwZmQyYzg3YjljMmJmMjNhMzEzIiwidW4iOiIifQ.boajw-2-ckf5fL7tS7EFRE8kuQ6im7xLt52FdoCG-WvOE2HLuhHyE-ClDQpG06uk0s0HCcbqIokgOUYtIR4eLHKpra1knA0kC013d5jjXIAk5hEP-eGOy6G4CYjUptcSHsezV-aPWhF_ZRVcWXdZ4vQ5cSnkaTe19KOc0kEYpR-lEzZI6wmkKsdJME7vu8r-ulpyI1flWbtFcj-tBd9tlQE91j768-Sif9FKQFZclunO_zOa_twig4uZiZn0zn44PuBa1LfwEYhee3tLEIybJp7_lhYeN780vyxwFM_7nd7-ddf9qQFTSbflIQa1GPvG3aBdmnyFDNW2MS_JoEBg7g';
const WORKSPACE_ID = '644f6e5ab30d853869ec919f';
const PROJECT_ID = '650a30501222568b1ae7a2c2';
const DATASTORE_ID = '655af47f12587163f1dd3b06';
let datastore;
let item;

let gamePlayer1 = false;
let gamePlayer2 = false;
let gameStatus = '';

const statusDisplay = document.querySelector('.game--status');

let gameActive = true;
let currentPlayer = "X";
let gameState = ["", "", "", "", "", "", "", "", ""];

const winningMessage = () => `Player ${currentPlayer} has won!`;
const drawMessage = () => `Game ended in a draw!`;
const currentPlayerTurn = () => {
    if (!item) return 'Start new game or join a game';
    if (gameStatus === 'active') {
        if (currentPlayer === 'X') {
            if (gamePlayer1) return `It's your turn`;
            if (gamePlayer2) return `Waiting for player 1 to select...`;
        } else {
            if (gamePlayer1) return `Waiting for player 2 to select...`;
            if (gamePlayer2) return `It's your turn`;
        }
    } else {
        if (gamePlayer1) return `Waiting for player 2 to join...`;
        return 'Game ended';
    }
}

statusDisplay.innerHTML = currentPlayerTurn();

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

function handleCellPlayed(clickedCell, clickedCellIndex) {
    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer;
}

function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusDisplay.innerHTML = currentPlayerTurn();
}

function handleResultValidation() {
    let roundWon = false;
    for(let i = 0; i <= 7; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];
        if(a === '' || b === '' || c === '')
            continue;
        if(a === b && b === c) {
            roundWon = true;
            break;
        }
    }
    if(roundWon) {
        statusDisplay.innerHTML = winningMessage();
        gameActive = false;
        return;
    }
    const roundDraw = !gameState.includes("");
    if(roundDraw) {
        statusDisplay.innerHTML = drawMessage();
        gameActive = false;
        return;
    }
    handlePlayerChange();
}

function handleCellClick(clickedCellEvent) {
    if (currentPlayer === 'O' && gamePlayer1) {
        alert('Please wait for player 1 to select');
        return;
    }
    if (currentPlayer === 'X' && gamePlayer2) {
        alert('Please wait for player 2 to select');
        return;
    }
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));
    if(gameState[clickedCellIndex] !== "" || !gameActive)
        return;
    handleCellPlayed(clickedCell, clickedCellIndex);
    sendMessage({ type: 'play', index: clickedCellIndex, player: currentPlayer });
    handleResultValidation();
}

function handleRestartGame() {
    gameActive = true;
    currentPlayer = "X";
    gameState = ["", "", "", "", "", "", "", "", ""];
    statusDisplay.innerHTML = currentPlayerTurn();
    document.querySelectorAll('.cell').forEach(cell => cell.innerHTML = "");
}

async function handleJoinGame() {
    const id = document.querySelector('#game--id').value;
    if (id === '') {
        alert('Please input game ID');
        return;
    }
    try {
        item = await datastore.item(id);
    } catch (e) {
        alert('Invalid game ID');
        return;
    }
    gamePlayer2 = true;
    sendMessage({ type: 'join' });
    handleSubscribe();
    document.querySelectorAll('.cell')
        .forEach(cell => cell.addEventListener('click', handleCellClick));
}

function sendMessage(message) {
    const history = item.comment();
    history.set('comment', JSON.stringify(message));
    history.save();
}

async function handleNewGame() {
    item = await datastore.item();
    item.set('Title', `Tic Tac Toe ${new Date().toLocaleString()}`);
    await item.save();
    gamePlayer1 = true;
    handleSubscribe();
    prompt('Please share this game ID with your friend', item.id);
    statusDisplay.innerHTML = currentPlayerTurn();
}

function handleSubscribe() {
    item.subscribe('update', async (data) => {
        const action = JSON.parse(data.comment);
        if (action.type === 'join') {
            gameStatus = 'active';
            statusDisplay.innerHTML = currentPlayerTurn();
            document.querySelectorAll('.cell')
                .forEach(cell => cell.addEventListener('click', handleCellClick));
            sendMessage({ type: 'connect' });
        }
        if (action.type === 'connect') {
            gameStatus = 'active';
            statusDisplay.innerHTML = currentPlayerTurn();
        }
        if (action.type === 'play') {
            if (action.player === 'X' && gamePlayer2 || action.player === 'O' && gamePlayer1) {
                handleCellPlayed(document.querySelector(`[data-cell-index="${action.index}"]`), action.index);
                handleResultValidation();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await client.setToken(API_TOKEN);
    await client.setWorkspace(WORKSPACE_ID);
    const project = await client.currentWorkspace.project(PROJECT_ID);
    datastore = await project.datastore(DATASTORE_ID);
    document.querySelector('.game--join')
        .addEventListener('click', handleJoinGame);
    document.querySelector('.game--restart')
        .addEventListener('click', handleNewGame);
});
