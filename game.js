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
let previousMaze = [];
let ghosts = [];
let gameRunning = true;

// Load images
const playerImg = new Image();
playerImg.src = "assets/player.png";

const goalImg = new Image();
goalImg.src = "assets/goal.png";

const ghostImg = new Image();
ghostImg.src = "assets/ghost.png";

// Load sounds
const moveSound = new Audio("assets/move.mp3");
const wallSound = new Audio("assets/wall.mp3");
const goalSound = new Audio("assets/goal.mp3");
const ghostSound = new Audio("assets/ghost.mp3");

// Generate Maze
function generateMaze() {
    let newMaze = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => {
            const random = Math.random();
            return random > 0.3 ? 0 : random > 0.2 ? 2 : 1; // 0 = open, 1 = wall, 2 = grey (slow)
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
    ghosts.forEach(g => ctx.drawImage(ghostImg, g.x * cellSize, g.y * cellSize, cellSize, cellSize));
}

// Move Player
function movePlayer(dx, dy) {
    if (!gameRunning) return;
    let newX = player.x + dx;
    let newY = player.y + dy;
    if (maze[newY] && maze[newY][newX] !== 1) {
        player.x = newX;
        player.y = newY;
        moveSound.play();
        if (maze[newY][newX] === 2) ghostSound.play(); // Stepping on grey cell attracts ghosts
    } else {
        wallSound.play();
    }
    if (player.x === goal.x && player.y === goal.y) {
        goalSound.play();
        levelUp();
    }
    drawMaze();
}

// Ghost Movement
function moveGhosts() {
    ghosts.forEach(g => {
        let dir = Math.random() > 0.5 ? { x: 1, y: 0 } : { x: 0, y: 1 };
        let newX = g.x + dir.x;
        let newY = g.y + dir.y;
        if (maze[newY] && maze[newY][newX] !== 1) {
            g.x = newX;
            g.y = newY;
        }
    });
}

// Level Up
function levelUp() {
    level++;
    shiftInterval = Math.max(1000, shiftInterval - 500);
    if (level % 2 === 0 && ghosts.length < 4) {
        ghosts.push({ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) });
    }
    resetGame();
}

// Reset Game
function resetGame() {
    player = { x: 0, y: 0 };
    maze = generateMaze();
    drawMaze();
}

setInterval(moveGhosts, 1000);
resetGame();
