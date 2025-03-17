const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 400;

const gridSize = 10;
const cellSize = canvas.width / gridSize;
let level = 1;
let shiftInterval = 5000;
let timeLeft = shiftInterval / 1000;
let player = { x: 0, y: 0 };
let goal = { x: 0, y: 0 };
let maze = [];
let ghosts = [];
let gameRunning = true;

// Load images
const playerImg = new Image();
playerImg.src = "assets/player.png";

const goalImg = new Image();
goalImg.src = "assets/goal.png";

const ghostImg = new Image();
ghostImg.src = "assets/ghost.png";

// Timer Logic
function startTimer() {
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

// Generate Maze
function generateMaze() {
    let newMaze = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => {
            const rand = Math.random();
            return rand > 0.7 ? 1 : rand > 0.5 ? 2 : 0; // 1 = wall, 2 = grey (slow), 0 = open path
        })
    );
    newMaze[player.y][player.x] = 0;
    placeGoal(newMaze);
    return newMaze;
}

function placeGoal(newMaze) {
    do {
        goal.x = Math.floor(Math.random() * gridSize);
        goal.y = Math.floor(Math.random() * gridSize);
    } while (newMaze[goal.y][goal.x] === 1);
    newMaze[goal.y][goal.x] = 3;
}

// Draw Game
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = "black";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (maze[y][x] === 2) {
                ctx.fillStyle = "grey";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
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
    if (maze[newY] && maze[newY][newX] !== 1) {
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

// Shift Maze
function shiftMaze() {
    maze = generateMaze();
    drawMaze();
    timeLeft = shiftInterval / 1000;
}

// Reset Game
function resetGame() {
    player = { x: 0, y: 0 };
    maze = generateMaze();
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
