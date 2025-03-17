const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 400;

const gridSize = 10;
const cellSize = canvas.width / gridSize;
let level = 1;
let shiftInterval = 5000;
let timeLeft = 5;
let player = { x: 0, y: 0 };
let goal = { x: 0, y: 0 };
let maze = [];
let gameRunning = false;

// Load images
const playerImg = new Image();
playerImg.src = "assets/player.png";

const goalImg = new Image();
goalImg.src = "assets/goal.png";

// Timer Logic
function startTimer() {
    timeLeft = 5;
    document.getElementById("timer").innerText = timeLeft;
    let timer = setInterval(() => {
        if (!gameRunning) {
            clearInterval(timer);
            return;
        }
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) {
            shiftMaze();
        }
    }, 1000);
}

// Generate Proper Maze (White = Walkable, Black = Wall)
function generateMaze() {
    let newMaze = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => (Math.random() > 0.7 ? 1 : 0)) // 1 = Wall, 0 = Walkable
    );
    ensureValidMaze(newMaze);
    return newMaze;
}

// Ensure Maze is Playable
function ensureValidMaze(newMaze) {
    newMaze[player.y][player.x] = 0; // Ensure player starts in a white cell
    newMaze[goal.y][goal.x] = 0; // Ensure goal remains accessible
}

// Place Goal (Random but in a White Cell)
function placeGoal(newMaze) {
    do {
        goal.x = Math.floor(Math.random() * gridSize);
        goal.y = Math.floor(Math.random() * gridSize);
    } while (newMaze[goal.y][goal.x] === 1);
}

// Draw Maze with Player & Goal
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            ctx.fillStyle = maze[y][x] === 1 ? "black" : "white";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    ctx.drawImage(goalImg, goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);
    ctx.drawImage(playerImg, player.x * cellSize, player.y * cellSize, cellSize, cellSize);
}

// Move Player
function movePlayer(dx, dy) {
    if (!gameRunning) return;
    let newX = player.x + dx;
    let newY = player.y + dy;
    if (maze[newY] && maze[newY][newX] === 0) {
        player.x = newX;
        player.y = newY;
    }
    if (player.x === goal.x && player.y === goal.y) {
        levelUp();
    }
    drawMaze();
}

// Level Up
function levelUp() {
    level++;
    shiftInterval = Math.max(1000, shiftInterval - 500);
    resetGame();
}

// Shift Maze Without Changing Goal
function shiftMaze() {
    let newMaze = generateMaze();
    while (newMaze[player.y][player.x] === 1) {
        player.x = Math.floor(Math.random() * gridSize);
        player.y = Math.floor(Math.random() * gridSize);
    }
    maze = newMaze;
    drawMaze();
    timeLeft = 5;
}

// Reset Game
function resetGame() {
    gameRunning = true;
    player = { x: 0, y: 0 };
    maze = generateMaze();
    placeGoal(maze);
    drawMaze();
}

// Touchscreen Controls
document.getElementById("up").addEventListener("click", () => movePlayer(0, -1));
document.getElementById("down").addEventListener("click", () => movePlayer(0, 1));
document.getElementById("left").addEventListener("click", () => movePlayer(-1, 0));
document.getElementById("right").addEventListener("click", () => movePlayer(1, 0));

// Keyboard Controls
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") movePlayer(0, -1);
    if (e.key === "ArrowDown") movePlayer(0, 1);
    if (e.key === "ArrowLeft") movePlayer(-1, 0);
    if (e.key === "ArrowRight") movePlayer(1, 0);
});

// Start Game
resetGame();
startTimer();
