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

// Sounds
const moveSound = new Audio('move.mp3');
const hitWallSound = new Audio('wall.mp3');
const goalSound = new Audio('goal.mp3');
const ghostSound = new Audio('ghost.mp3');

function generateMaze() {
    let newMaze = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => Math.random() > 0.3 ? 0 : 1)
    );
    newMaze[player.y][player.x] = 0;
    placeGoal(newMaze);
    return newMaze;
}

function placeGoal(newMaze) {
    do {
        goal.x = Math.floor(Math.random() * gridSize);
        goal.y = Math.floor(Math.random() * gridSize);
    } while (newMaze[goal.y][goal.x] === 1 || (goal.x === player.x && goal.y === player.y));
    newMaze[goal.y][goal.x] = 2;
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = "white";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    ctx.fillStyle = "gold";
    ctx.fillRect(goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);

    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.arc(player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    ghosts.forEach(g => {
        ctx.fillStyle = "red";
        ctx.fillRect(g.x * cellSize, g.y * cellSize, cellSize, cellSize);
    });

    document.getElementById("level").innerText = level;
    document.getElementById("timer").innerText = timeLeft;
}

function movePlayer(dx, dy) {
    if (!gameRunning) return;
    let newX = player.x + dx;
    let newY = player.y + dy;

    if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
        if (maze[newY][newX] !== 1) {
            player.x = newX;
            player.y = newY;
            moveSound.play();
        } else {
            hitWallSound.play();
        }
    }

    if (player.x === goal.x && player.y === goal.y) {
        goalSound.play();
        levelUp();
    }

    drawMaze();
}

function levelUp() {
    level++;
    shiftInterval = Math.max(1000, shiftInterval - 500);
    if (level % 2 === 0 && ghosts.length < 4) {
        ghosts.push({ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) });
    }
    resetGame();
}

function resetGame() {
    player = { x: 0, y: 0 };
    maze = generateMaze();
    drawMaze();
}

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") movePlayer(0, -1);
    if (e.key === "ArrowDown") movePlayer(0, 1);
    if (e.key === "ArrowLeft") movePlayer(-1, 0);
    if (e.key === "ArrowRight") movePlayer(1, 0);
});

resetGame();
