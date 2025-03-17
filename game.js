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
let ghosts = [];
let gameRunning = false;

// Load images
const playerImg = new Image();
playerImg.src = "assets/player.png";

const goalImg = new Image();
goalImg.src = "assets/goal.png";

const ghostImg = new Image();
ghostImg.src = "assets/ghost.png";

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

// Generate a Proper Maze with Corridors
function generateMaze() {
    let newMaze = Array(gridSize).fill().map(() => Array(gridSize).fill(1)); // Start with all walls

    function carvePassage(x, y) {
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
        ].sort(() => Math.random() - 0.5); // Randomize direction order

        newMaze[y][x] = 0; // Make this a white (walkable) cell

        for (const { dx, dy } of directions) {
            const nx = x + dx * 2;
            const ny = y + dy * 2;
            if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize && newMaze[ny][nx] === 1) {
                newMaze[y + dy][x + dx] = 0; // Open path in between
                carvePassage(nx, ny);
            }
        }
    }

    // Start carving from a random odd cell
    let startX = 1 + 2 * Math.floor(Math.random() * (gridSize / 2));
    let startY = 1 + 2 * Math.floor(Math.random() * (gridSize / 2));
    carvePassage(startX, startY);

    ensureValidMaze(newMaze);
    return newMaze;
}

// Ensure Maze is Playable
function ensureValidMaze(newMaze) {
    newMaze[player.y][player.x] = 0; // Ensure player remains in a walkable cell
    newMaze[goal.y][goal.x] = 0; // Ensure goal remains accessible
}

// Place Goal (Random but in a White Cell)
function placeGoal(newMaze) {
    do {
        goal.x = Math.floor(Math.random() * gridSize);
        goal.y = Math.floor(Math.random() * gridSize);
    } while (newMaze[goal.y][goal.x] === 1);
}

// Draw Maze with Player, Goal & Ghosts
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

    ghosts.forEach(g => ctx.drawImage(ghostImg, g.x * cellSize, g.y * cellSize, cellSize, cellSize));
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

// Level Up Logic
function levelUp() {
    level++;
    document.getElementById("level").innerText = level;
    shiftInterval = Math.max(1000, shiftInterval - 500);
    spawnGhosts();
    shiftMaze();
}

// Spawn Ghosts Progressively (Max 4)
function spawnGhosts() {
    if (ghosts.length < 4) {
        let newGhost;
        do {
            newGhost = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (maze[newGhost.y][newGhost.x] === 1 || (newGhost.x === player.x && newGhost.y === player.y));
        ghosts.push(newGhost);
    }
}

// Move Ghosts Randomly
function moveGhosts() {
    ghosts.forEach(g => {
        let directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
        ];
        let validMoves = directions.filter(({ dx, dy }) => {
            let nx = g.x + dx;
            let ny = g.y + dy;
            return maze[ny] && maze[ny][nx] === 0;
        });

        if (validMoves.length > 0) {
            let move = validMoves[Math.floor(Math.random() * validMoves.length)];
            g.x += move.dx;
            g.y += move.dy;
        }
    });

    drawMaze();
}

// Shift Maze Without Changing Player or Goal
function shiftMaze() {
    let newMaze = generateMaze();
    maze = newMaze;
    drawMaze();
    timeLeft = 5;
}

// Reset Game Without Moving Player
function resetGame() {
    gameRunning = true;
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
setInterval(moveGhosts, 1000);
