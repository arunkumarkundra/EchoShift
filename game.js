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

// Debugging flag to bypass images
const USE_IMAGES = false; // Set to false to use shapes instead of images

// Audio Elements (optional, comment out if not working)
const moveSound = new Audio('assets/move.mp3');
const wallSound = new Audio('assets/wall.mp3');
const goalSound = new Audio('assets/goal.mp3');
const ghostSound = new Audio('assets/ghost.mp3');
const mazeShiftSound = new Audio('assets/maze_shift.mp3');
const gameOverSound = new Audio('assets/game_over.mp3');

// Images (optional, only load if USE_IMAGES is true)
let playerImg, goalImg, ghostImg;
if (USE_IMAGES) {
    playerImg = new Image();
    goalImg = new Image();
    ghostImg = new Image();
    playerImg.src = 'assets/player.png';
    goalImg.src = 'assets/goal.png';
    ghostImg.src = 'assets/ghost.png';
}

// Initialize the game
function init() {
    console.log('init() called');
    
    // Get canvas and context
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

    // Initialize game state
    generateMaze();
    placePlayer();
    placeGoal();
    updateGhosts();

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (upBtn) upBtn.addEventListener('click', () => setPlayerDirection(0, -1));
    else console.error('up-btn not found');
    if (downBtn) downBtn.addEventListener('click', () => setPlayerDirection(0, 1));
    else console.error('down-btn not found');
    if (leftBtn) leftBtn.addEventListener('click', () => setPlayerDirection(-1, 0));
    else console.error('left-btn not found');
    if (rightBtn) rightBtn.addEventListener('click', () => setPlayerDirection(1, 0));
    else console.error('right-btn not found');
    if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
    else console.error('playAgainBtn not found');
    if (shareBtn) shareBtn.addEventListener('click', shareGame);
    else console.error('shareBtn not found');

    // Force initial draw
    draw();
    console.log('Initial draw called');

    // Start game loop and countdown
    startGameLoop();
    startCountdown();
    updateStats();
}

// Generate a maze with structured corridors
function generateMaze() {
    console.log('Generating maze');
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
    console.log('Maze generated:', maze);
}

function placePlayer() {
    console.log('Placing player');
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
    console.log('Player placed at:', player.x, player.y);
}

function placeGoal() {
    console.log('Placing goal');
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
    console.log('Goal placed at:', goal.x, goal.y);
}

function updateGhosts() {
    console.log('Updating ghosts');
    const ghostCount = Math.min(MAX_GHOSTS, Math.floor((level - 3) / 4));
    while (ghosts.length < ghostCount) {
        addGhost();
    }
}

function addGhost() {
    console.log('Adding ghost');
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (maze[y][x] === 0 && (x !== player.x || y !== player.y) && (x !== goal.x || y !== goal.y)) {
            ghosts.push({ x, y, direction: null });
            placed = true;
            try { ghostSound.play(); } catch(e) { console.log("Ghost sound play failed:", e); }
        }
    }
    console.log('Ghosts:', ghosts);
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
        try { moveSound.play(); } catch(e) { console.log("Move sound play failed:", e); }
        if (player.x === goal.x && player.y === goal.y) {
            try { goalSound.play(); } catch(e) { console.log("Goal sound play failed:", e); }
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
        try { wallSound.play(); } catch(e) { console.log("Wall sound play failed:", e); }
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
    console.log('Starting game loop');
    function gameLoop(timestamp) {
        if (gameOver) return;
        if (timestamp - lastTimestamp > 200) {
            moveGhosts();
            movePlayer();
            draw();
            lastTimestamp = timestamp;
            updateStats();
        }
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

function startCountdown() {
    console.log('Starting countdown');
    document.getElementById('timer').textContent = timer;
    countdownTimer = setInterval(() => {
        timer--;
        document.getElementById('timer').textContent = timer;
        if (timer <= 0) {
            try { mazeShiftSound.play(); } catch(e) { console.log("Maze shift sound play failed:", e); }
            shiftMaze();
            timer = shiftInterval;
            document.getElementById('timer').textContent = timer;
        }
    }, 1000);
}

function shiftMaze() {
    console.log('Shifting maze');
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
    console.log('Drawing frame');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw maze
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // Draw goal
    if (USE_IMAGES && goalImg.complete) {
        ctx.drawImage(goalImg, goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    } else {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Draw ghosts
    for (const ghost of ghosts) {
        if (USE_IMAGES && ghostImg.complete) {
            ctx.drawImage(ghostImg, ghost.x * CELL_SIZE, ghost.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(ghost.x * CELL_SIZE, ghost.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // Draw player
    if (!caughtByGhost) {
        if (USE_IMAGES && playerImg.complete) {
            ctx.drawImage(playerImg, player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
}

function endGame() {
    console.log('Game over');
    gameOver = true;
    try { gameOverSound.play(); } catch(e) { console.log("Game over sound play failed:", e); }
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
    console.log('Resetting game');
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
    document.getElementById('steps').textContent = '0';
    document.getElementById('time').textContent = '0';
    document.getElementById('gameOverScreen').style.display = 'none';
    generateMaze();
    placePlayer();
    placeGoal();
    startGameLoop();
    startCountdown();
}

function shareGame() {
    console.log('Sharing game');
    const playerName = document.getElementById('playerName').value || 'Anonymous';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const shareText = `${playerName} reached Level ${level} with ${player.steps} steps in ${elapsed}s in MazeShift!`;
    if (navigator.share) {
        navigator.share({
            title: 'MazeShift Score',
            text: shareText,
            url: window.location.href
        }).catch(error => {
            console.log('Error sharing:', error);
        });
    } else {
        navigator.clipboard.writeText(shareText + ' ' + window.location.href)
            .then(() => alert('Share text copied to clipboard!'))
            .catch(err => {
                console.log('Failed to copy:', err);
                alert('Share feature not available. Tell your friends about your score!');
            });
    }
}

function updateStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const stepsEl = document.getElementById('steps');
    const timeEl = document.getElementById('time');
    if (stepsEl) stepsEl.textContent = player.steps;
    if (timeEl) timeEl.textContent = elapsed;
}

window.addEventListener('resize', () => {
    console.log('Window resized');
    const container = document.querySelector('.game-area');
    const width = Math.min(container.clientWidth, CANVAS_SIZE);
    canvas.style.width = width + 'px';
    canvas.style.height = width + 'px';
});

function setupSoundControls() {
    console.log('Setting up sound controls');
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
    console.log('Setting up mobile controls');
    if (isMobile()) {
        const mobileControls = document.querySelector('.mobile-controls');
        if (mobileControls) mobileControls.style.display = 'block';
        else console.error('mobile-controls element not found');
    }
}

window.addEventListener('load', () => {
    console.log('Window loaded');
    setupSoundControls();
    setupMobileControls();
    init();
});
