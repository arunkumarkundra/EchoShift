// Game Constants
const CELL_SIZE = 24;
const GRID_SIZE = 20;
const CANVAS_SIZE = 480;
const INITIAL_SHIFT_INTERVAL = 10;
const MIN_SHIFT_INTERVAL = 1;
const MAX_GHOSTS = 4;

// Game Variables
let canvas, ctx;
let player = { x: 0, y: 0, direction: null, steps: 0 };
let goal = { x: 0, y: 0 };
let ghosts = [];
let maze = [];
let level = 1;
let shiftInterval = INITIAL_SHIFT_INTERVAL;
let timer = shiftInterval;
let gameOver = false;
let countdownTimer;
let lastTimestamp = 0;
let startTime = Date.now();
let caughtByGhost = false;
let imagesLoaded = false;

// Audio Elements
const moveSound = new Audio('assets/move.mp3');
const wallSound = new Audio('assets/wall.mp3');
const goalSound = new Audio('assets/goal.mp3');
const ghostSound = new Audio('assets/ghost.mp3');
const mazeShiftSound = new Audio('assets/maze_shift.mp3');
const gameOverSound = new Audio('assets/game_over.mp3');

// Images
const playerImg = new Image();
const goalImg = new Image();
const ghostImg = new Image();

playerImg.src = 'assets/player.png';
goalImg.src = 'assets/goal.png';
ghostImg.src = 'assets/ghost.png';

// Wait for images to load
Promise.all([new Promise(resolve => playerImg.onload = resolve), new Promise(resolve => goalImg.onload = resolve), new Promise(resolve => ghostImg.onload = resolve)])
    .catch(error => console.error('Image loading failed:', error))
    .finally(() => {
        imagesLoaded = true;
        init();
    });

// Initialize the game
function init() {
    if (!imagesLoaded) {
        console.log('Waiting for images to load...');
        return;
    }

    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get canvas context!');
        return;
    }
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    console.log('Canvas initialized:', canvas.width, canvas.height);

    generateMaze();
    placePlayer();
    placeGoal();
    updateGhosts();

    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('up-btn').addEventListener('click', () => setPlayerDirection(0, -1));
    document.getElementById('down-btn').addEventListener('click', () => setPlayerDirection(0, 1));
    document.getElementById('left-btn').addEventListener('click', () => setPlayerDirection(-1, 0));
    document.getElementById('right-btn').addEventListener('click', () => setPlayerDirection(1, 0));

    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    document.getElementById('shareBtn').addEventListener('click', shareGame);

    startGameLoop();
    startCountdown();
    updateStats(); // Initial stats update
}

// Generate a maze with structured corridors
function generateMaze() {
    maze = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1));
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));

    function carve(x, y) {
        visited[y][x] = true;
        maze[y][x] = 0;

        const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]];
        directions.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !visited[ny][nx]) {
                maze[y + dy/2][x + dx/2] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(0, 0);
    const wallDensity = 0.3 + ((level - 1) * 0.01) % 0.2;
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1 && Math.random() < wallDensity) maze[y][x] = 1;
        }
    }
}

function placePlayer() {
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (maze[y][x] === 0) {
            player.x = x;
            player.y = y;
            placed = true;
        }
    }
}

function placeGoal() {
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (maze[y][x] === 0 && (x !== player.x || y !== player.y)) {
            goal.x = x;
            goal.y = y;
            placed = true;
        }
    }
}

function updateGhosts() {
    const ghostCount = Math.min(MAX_GHOSTS, Math.floor((level - 3) / 4));
    while (ghosts.length < ghostCount) {
        addGhost();
    }
}

function addGhost() {
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (maze[y][x] === 0 && (x !== player.x || y !== player.y) && (x !== goal.x || y !== goal.y)) {
            ghosts.push({ x, y, direction: null });
            placed = true;
            ghostSound.play().catch(e => console.log("Audio play failed:", e));
        }
    }
}

function moveGhosts() {
    for (let ghost of ghosts) {
        if (!ghost.direction || !isValidMove(ghost.x + ghost.direction.x, ghost.y + ghost.direction.y)) {
            const directions = level >= 15 ? getPathfindingDirection(ghost) : getRandomDirection();
            for (const dir of directions) {
                if (isValidMove(ghost.x + dir.x, ghost.y + dir.y)) {
                    ghost.direction = dir;
                    break;
                }
            }
        }
        if (ghost.direction && isValidMove(ghost.x + ghost.direction.x, ghost.y + ghost.direction.y)) {
            ghost.x += ghost.direction.x;
            ghost.y += ghost.direction.y;
            if (ghost.x === player.x && ghost.y === player.y) {
                caughtByGhost = true;
                endGame();
                return;
            }
        }
    }
}

function getPathfindingDirection(ghost) {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    return [
        { x: dx > 0 ? 1 : dx < 0 ? -1 : 0, y: 0 },
        { x: 0, y: dy > 0 ? 1 : dy < 0 ? -1 : 0 },
        { x: dx > 0 ? -1 : 1, y: 0 },
        { x: 0, y: dy > 0 ? -1 : 1 }
    ];
}

function getRandomDirection() {
    const dirs = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
    dirs.sort(() => Math.random() - 0.5);
    return dirs;
}

function isValidMove(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && maze[y][x] === 0;
}

function handleKeyDown(e) {
    if (gameOver) return;
    switch (e.key) {
        case 'ArrowUp': setPlayerDirection(0, -1); break;
        case 'ArrowDown': setPlayerDirection(0, 1); break;
        case 'ArrowLeft': setPlayerDirection(-1, 0); break;
        case 'ArrowRight': setPlayerDirection(1, 0); break;
    }
}

function setPlayerDirection(dx, dy) {
    player.direction = { x: dx, y: dy };
    movePlayer();
}

function movePlayer() {
    if (gameOver || !player.direction) return;
    const newX = player.x + player.direction.x;
    const newY = player.y + player.direction.y;

    if (isValidMove(newX, newY)) {
        player.x = newX;
        player.y = newY;
        player.steps++;
        moveSound.play().catch(e => console.log("Audio play failed:", e));
        if (player.x === goal.x && player.y === goal.y) {
            goalSound.play().catch(e => console.log("Audio play failed:", e));
            levelUp();
        }
        for (const ghost of ghosts) {
            if (ghost.x === player.x && ghost.y === player.y) {
                caughtByGhost = true;
                endGame();
                return;
            }
        }
    } else {
        wallSound.play().catch(e => console.log("Audio play failed:", e));
    }
    updateStats();
}

function levelUp() {
    level++;
    const change = (level - 1) % 4;
    if (change === 0) shiftInterval = Math.max(MIN_SHIFT_INTERVAL, shiftInterval - 1);
    else if (change === 1) {} // Wall density increases in generateMaze
    else if (change === 2) updateGhosts();
    else if (change === 3 && level >= 15) {} // Ghost behavior changes in moveGhosts

    timer = shiftInterval;
    document.getElementById('level').textContent = level;
    document.getElementById('timer').textContent = timer;
    generateMaze();
    maze[player.y][player.x] = 0;
    placeGoal();
    updateGhosts();
    updateStats();
}

function startGameLoop() {
    function gameLoop(timestamp) {
        if (gameOver) return;
        if (timestamp - lastTimestamp > 200) {
            moveGhosts();
            movePlayer();
            draw();
            lastTimestamp = timestamp;
            updateStats(); // Update stats in real-time
        }
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

function startCountdown() {
    document.getElementById('timer').textContent = timer;
    countdownTimer = setInterval(() => {
        timer--;
        document.getElementById('timer').textContent = timer;
        if (timer <= 0) {
            mazeShiftSound.play().catch(e => console.log("Audio play failed:", e));
            shiftMaze();
            timer = shiftInterval;
            document.getElementById('timer').textContent = timer;
        }
    }, 1000);
}

function shiftMaze() {
    const oldGhosts = ghosts.map(g => ({ x: g.x, y: g.y, direction: g.direction }));
    generateMaze();
    maze[player.y][player.x] = 0;
    goal.x = goal.x; goal.y = goal.y; maze[goal.y][goal.x] = 0;
    ghosts = oldGhosts.map(g => ({ ...g, direction: null }));
}

function draw() {
    if (!ctx) {
        console.error('Canvas context not available!');
        return;
    }
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    ctx.drawImage(goalImg, goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    for (const ghost of ghosts) {
        ctx.drawImage(ghostImg, ghost.x * CELL_SIZE, ghost.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if (!caughtByGhost) {
        ctx.drawImage(playerImg, player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
}

function endGame() {
    gameOver = true;
    gameOverSound.play().catch(e => console.log("Audio play failed:", e));
    clearInterval(countdownTimer);
    draw();
    setTimeout(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('finalLevel').textContent = level;
        document.getElementById('finalSteps').textContent = player.steps;
        document.getElementById('finalTime').textContent = elapsed;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }, 1000);
}

function resetGame() {
    level = 1;
    shiftInterval = INITIAL_SHIFT_INTERVAL;
    timer = shiftInterval;
    gameOver = false;
    ghosts = [];
    player.steps = 0;
    startTime = Date.now();
    caughtByGhost = false;

    document.getElementById('level').textContent = level;
    document.getElementById('timer').textContent = timer;
    document.getElementById('steps')?.textContent = '0';
    document.getElementById('time')?.textContent = '0';
    document.getElementById('gameOverScreen').style.display = 'none';
    generateMaze();
    placePlayer();
    placeGoal();
    startGameLoop();
    startCountdown();
}

function shareGame() {
    const playerName = document.getElementById('playerName').value || 'Anonymous';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const shareText = `${playerName} reached Level ${level} with ${player.steps} steps in ${elapsed}s in MazeShift!`;
    // Sharing logic remains the same
}

function updateStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('steps')?.textContent = player.steps;
    document.getElementById('time')?.textContent = elapsed;
}

window.addEventListener('resize', () => {
    const container = document.querySelector('.game-area');
    const width = Math.min(container.clientWidth, CANVAS_SIZE);
    canvas.style.width = width + 'px';
    canvas.style.height = width + 'px';
    canvas.style.border = '3px solid #333'; // Ensure border scales
});

function setupSoundControls() {
    const sounds = [moveSound, wallSound, goalSound, ghostSound, mazeShiftSound, gameOverSound];
    sounds.forEach(sound => {
        sound.volume = 0.5;
        sound.load();
    });
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function setupMobileControls() {
    if (isMobile()) document.querySelector('.mobile-controls').style.display = 'block';
}

window.addEventListener('load', () => {
    setupSoundControls();
    setupMobileControls();
    // init() will be called when images are loaded
});
