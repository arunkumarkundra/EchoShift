// Game Constants
const CELL_SIZE = 20;
const GRID_SIZE = 20; // 20x20 grid for 400x400 canvas
const CANVAS_SIZE = 400;
const INITIAL_SHIFT_INTERVAL = 10; // Initial maze shift interval in seconds
const MIN_SHIFT_INTERVAL = 1; // Minimum maze shift interval in seconds

// Game Variables
let canvas, ctx;
let player = { x: 0, y: 0 };
let goal = { x: 0, y: 0 };
let ghosts = [];
let maze = [];
let level = 1;
let shiftInterval = INITIAL_SHIFT_INTERVAL;
let timer = shiftInterval;
let gameOver = false;
let countdownTimer;
let lastTimestamp = 0;

// Audio Elements
const moveSound = new Audio('assets/move.mp3');
const wallSound = new Audio('assets/wall.mp3');
const goalSound = new Audio('assets/goal.mp3');
const ghostSound = new Audio('assets/ghost.mp3');
const mazeShiftSound = new Audio('assets/maze_shift.mp3');
const gameOverSound = new Audio('assets/game_over.mp3');

// Images
const playerImg = new Image();
playerImg.src = 'assets/player.png';
const goalImg = new Image();
goalImg.src = 'assets/goal.png';
const ghostImg = new Image();
ghostImg.src = 'assets/ghost.png';

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Create initial maze
    generateMaze();
    
    // Set player at random position
    placePlayer();
    
    // Set goal at random position
    placeGoal();
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('up-btn').addEventListener('click', () => movePlayer(0, -1));
    document.getElementById('down-btn').addEventListener('click', () => movePlayer(0, 1));
    document.getElementById('left-btn').addEventListener('click', () => movePlayer(-1, 0));
    document.getElementById('right-btn').addEventListener('click', () => movePlayer(1, 0));
    
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    document.getElementById('shareBtn').addEventListener('click', shareGame);
    
    // Start the game loop
    startGameLoop();
    
    // Start the countdown timer
    startCountdown();
}

// Generate a random maze
function generateMaze() {
    maze = [];
    
    // Calculate wall density based on level (increasing difficulty)
    const wallDensity = 0.3 + (level * 0.01);
    const maxWallDensity = 0.5; // Maximum wall density
    const finalWallDensity = Math.min(wallDensity, maxWallDensity);
    
    // Generate initial random maze
    for (let y = 0; y < GRID_SIZE; y++) {
        const row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            // Generate walls with probability of wallDensity
            row.push(Math.random() < finalWallDensity ? 1 : 0);
        }
        maze.push(row);
    }
    
    // Ensure maze is traversable
    ensureTraversability();
}

// Make sure the maze is traversable
function ensureTraversability() {
    // Simple algorithm to ensure there's a path
    // This is a simplified version and may not create perfect mazes
    
    // Create a path from top-left to bottom-right
    for (let i = 0; i < GRID_SIZE; i++) {
        // Create horizontal and vertical paths
        let randomX = Math.floor(Math.random() * GRID_SIZE);
        let randomY = Math.floor(Math.random() * GRID_SIZE);
        
        // Create some random corridors
        for (let j = 0; j < randomX; j++) {
            maze[i][j] = 0; // Horizontal path
        }
        
        for (let j = 0; j < randomY; j++) {
            maze[j][i] = 0; // Vertical path
        }
    }
    
    // Ensure there are enough open spaces
    let openSpaces = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 0) openSpaces++;
        }
    }
    
    // If there are too few open spaces, create more
    const minOpenSpaces = GRID_SIZE * GRID_SIZE * 0.4;
    if (openSpaces < minOpenSpaces) {
        while (openSpaces < minOpenSpaces) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);
            if (maze[y][x] === 1) {
                maze[y][x] = 0;
                openSpaces++;
            }
        }
    }
}

// Place player at random position
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

// Place goal at random position
function placeGoal() {
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        
        // Ensure goal is not at player position and is on walkable cell
        if (maze[y][x] === 0 && (x !== player.x || y !== player.y)) {
            goal.x = x;
            goal.y = y;
            placed = true;
        }
    }
}

// Add or update ghosts based on level
function updateGhosts() {
    const maxGhosts = 4;
    const ghostStartLevel = 4;
    
    // Clear existing ghosts
    ghosts = [];
    
    // Determine number of ghosts for current level
    const numGhosts = Math.min(maxGhosts, Math.max(0, Math.floor((level - ghostStartLevel + 1) / 1)));
    
    // Add ghosts at random positions
    for (let i = 0; i < numGhosts; i++) {
        addGhost();
    }
}

// Add a ghost at a random position
function addGhost() {
    let placed = false;
    while (!placed) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        
        // Ensure ghost is not at player or goal position and is on walkable cell
        if (maze[y][x] === 0 && 
            (x !== player.x || y !== player.y) && 
            (x !== goal.x || y !== goal.y)) {
            
            ghosts.push({ x, y });
            placed = true;
            
            // Play ghost sound
            ghostSound.play().catch(e => console.log("Audio play failed:", e));
        }
    }
}

// Move ghosts
function moveGhosts() {
    for (let i = 0; i < ghosts.length; i++) {
        const ghost = ghosts[i];
        
        // Advanced ghost AI for higher levels
        if (level >= 15) {
            // Simple pathfinding towards player
            const dx = player.x - ghost.x;
            const dy = player.y - ghost.y;
            
            // Determine direction with higher probability of moving towards player
            let moveX = 0;
            let moveY = 0;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                // Move horizontally with higher probability
                moveX = dx > 0 ? 1 : -1;
                moveY = Math.random() > 0.7 ? (dy > 0 ? 1 : -1) : 0;
            } else {
                // Move vertically with higher probability
                moveY = dy > 0 ? 1 : -1;
                moveX = Math.random() > 0.7 ? (dx > 0 ? 1 : -1) : 0;
            }
            
            // Try to move in the chosen direction
            if (isValidMove(ghost.x + moveX, ghost.y + moveY)) {
                ghost.x += moveX;
                ghost.y += moveY;
            }
        } else {
            // Random movement for lower levels
            const directions = [
                { x: 0, y: -1 }, // Up
                { x: 0, y: 1 },  // Down
                { x: -1, y: 0 }, // Left
                { x: 1, y: 0 }   // Right
            ];
            
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            
            if (isValidMove(ghost.x + randomDir.x, ghost.y + randomDir.y)) {
                ghost.x += randomDir.x;
                ghost.y += randomDir.y;
            }
        }
        
        // Check if ghost caught player
        if (ghost.x === player.x && ghost.y === player.y) {
            endGame();
            return;
        }
    }
}

// Check if move is valid
function isValidMove(x, y) {
    // Check if within bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return false;
    }
    
    // Check if wall
    if (maze[y][x] === 1) {
        return false;
    }
    
    return true;
}

// Handle keyboard input
function handleKeyDown(e) {
    if (gameOver) return;
    
    switch (e.key) {
        case 'ArrowUp':
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
            movePlayer(1, 0);
            break;
    }
}

// Move player
function movePlayer(dx, dy) {
    if (gameOver) return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    if (isValidMove(newX, newY)) {
        player.x = newX;
        player.y = newY;
        
        // Play move sound
        moveSound.play().catch(e => console.log("Audio play failed:", e));
        
        // Check if player reached goal
        if (player.x === goal.x && player.y === goal.y) {
            // Play goal sound
            goalSound.play().catch(e => console.log("Audio play failed:", e));
            
            // Level up
            levelUp();
        }
        
        // Check if player collided with a ghost
        for (const ghost of ghosts) {
            if (ghost.x === player.x && ghost.y === player.y) {
                endGame();
                return;
            }
        }
    } else {
        // Play wall hit sound
        wallSound.play().catch(e => console.log("Audio play failed:", e));
    }
}

// Level up
function levelUp() {
    level++;
    
    // Update UI
    document.getElementById('level').textContent = level;
    
    // Decrease shift interval
    shiftInterval = Math.max(MIN_SHIFT_INTERVAL, INITIAL_SHIFT_INTERVAL - (level - 1));
    
    // Reset timer
    timer = shiftInterval;
    document.getElementById('timer').textContent = timer;
    
    // Generate new maze
    generateMaze();
    
    // Keep player position but ensure it's on a walkable cell
    maze[player.y][player.x] = 0;
    
    // Place goal at new position
    placeGoal();
    
    // Update ghosts
    updateGhosts();
}

// Start the game loop
function startGameLoop() {
    function gameLoop(timestamp) {
        if (gameOver) return;
        
        // Calculate time elapsed
        const elapsed = timestamp - lastTimestamp;
        
        // Update every 200ms
        if (elapsed > 200) {
            // Move ghosts
            moveGhosts();
            
            // Draw everything
            draw();
            
            lastTimestamp = timestamp;
        }
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the countdown timer
function startCountdown() {
    // Update timer display
    document.getElementById('timer').textContent = timer;
    
    // Start the countdown
    countdownTimer = setInterval(() => {
        timer--;
        
        // Update timer display
        document.getElementById('timer').textContent = timer;
        
        // Check if timer has reached zero
        if (timer <= 0) {
            // Play maze shift sound
            mazeShiftSound.play().catch(e => console.log("Audio play failed:", e));
            
            // Shift the maze
            shiftMaze();
            
            // Reset timer
            timer = shiftInterval;
            document.getElementById('timer').textContent = timer;
        }
    }, 1000);
}

// Shift the maze
function shiftMaze() {
    // Remember player position
    const playerX = player.x;
    const playerY = player.y;
    
    // Remember goal position
    const goalX = goal.x;
    const goalY = goal.y;
    
    // Generate new maze
    generateMaze();
    
    // Keep player position and ensure it's on a walkable cell
    player.x = playerX;
    player.y = playerY;
    maze[player.y][player.x] = 0;
    
    // Keep goal position and ensure it's on a walkable cell
    goal.x = goalX;
    goal.y = goalY;
    maze[goal.y][goal.x] = 0;
}

// Draw everything
function draw() {
    // Clear the canvas
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
    ctx.drawImage(goalImg, goal.x * CELL_SIZE, goal.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw ghosts
    for (const ghost of ghosts) {
        ctx.drawImage(ghostImg, ghost.x * CELL_SIZE, ghost.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    // Draw player
    ctx.drawImage(playerImg, player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

// End the game
function endGame() {
    // Set game over flag
    gameOver = true;
    
    // Play game over sound
    gameOverSound.play().catch(e => console.log("Audio play failed:", e));
    
    // Stop the countdown timer
    // Stop the countdown timer
    clearInterval(countdownTimer);
    
    // Draw final state to show what happened
    draw();
    
    // Show game over screen after a short delay
    setTimeout(() => {
        document.getElementById('finalLevel').textContent = level;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }, 1000);
}

// Reset the game
function resetGame() {
    // Reset game variables
    level = 1;
    shiftInterval = INITIAL_SHIFT_INTERVAL;
    timer = shiftInterval;
    gameOver = false;
    ghosts = [];
    
    // Update UI
    document.getElementById('level').textContent = level;
    document.getElementById('timer').textContent = timer;
    
    // Hide game over screen
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Generate new maze
    generateMaze();
    
    // Place player and goal
    placePlayer();
    placeGoal();
    
    // Start the game loop
    startGameLoop();
    
    // Start the countdown timer
    startCountdown();
}

// Share game results
function shareGame() {
    const playerName = document.getElementById('playerName').value || 'Anonymous';
    const shareText = `${playerName} reached Level ${level} in MazeShift! Can you beat this score? Play now!`;
    
    // Create a canvas for the screenshot
    const screenshotCanvas = document.createElement('canvas');
    screenshotCanvas.width = canvas.width;
    screenshotCanvas.height = canvas.height;
    const screenshotCtx = screenshotCanvas.getContext('2d');
    
    // Draw the game state to the screenshot canvas
    screenshotCtx.drawImage(canvas, 0, 0);
    
    // If sharing API is available, use it
    if (navigator.share) {
        // Convert canvas to blob
        screenshotCanvas.toBlob((blob) => {
            // Create a file from the blob
            const file = new File([blob], 'maze-shift-score.png', { type: 'image/png' });
            
            // Share the file and text
            navigator.share({
                title: 'MazeShift Score',
                text: shareText,
                url: window.location.href,
                files: [file]
            }).catch(error => {
                console.log('Error sharing:', error);
                fallbackShare();
            });
        });
    } else {
        fallbackShare();
    }
    
    // Fallback sharing method
    function fallbackShare() {
        // Copy share text to clipboard
        navigator.clipboard.writeText(shareText + ' ' + window.location.href)
            .then(() => {
                alert('Share text copied to clipboard!');
            })
            .catch(err => {
                console.log('Failed to copy:', err);
                alert('Share feature not available. Tell your friends about your Level ' + level + ' score!');
            });
    }
}

// Handle window resize for mobile responsiveness
window.addEventListener('resize', () => {
    // Adjust canvas size for mobile if needed
    if (window.innerWidth <= 768) {
        const container = document.querySelector('.game-area');
        const containerWidth = container.clientWidth;
        
        // Maintain aspect ratio
        if (containerWidth < CANVAS_SIZE) {
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerWidth + 'px';
        } else {
            canvas.style.width = CANVAS_SIZE + 'px';
            canvas.style.height = CANVAS_SIZE + 'px';
        }
    } else {
        // Reset to default size on desktop
        canvas.style.width = CANVAS_SIZE + 'px';
        canvas.style.height = CANVAS_SIZE + 'px';
    }
});

// Sound controls
function setupSoundControls() {
    // Set volume for all sounds
    const sounds = [moveSound, wallSound, goalSound, ghostSound, mazeShiftSound, gameOverSound];
    sounds.forEach(sound => {
        sound.volume = 0.5;
    });
    
    // Preload sounds
    sounds.forEach(sound => {
        sound.load();
    });
}

// Check if device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Add touch events for mobile
function setupMobileControls() {
    if (isMobile()) {
        document.querySelector('.mobile-controls').style.display = 'block';
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    setupSoundControls();
    setupMobileControls();
    init();
    
    // Initial resize check
    if (window.innerWidth <= 768) {
        const container = document.querySelector('.game-area');
        const containerWidth = container.clientWidth;
        
        // Maintain aspect ratio
        if (containerWidth < CANVAS_SIZE) {
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerWidth + 'px';
        }
    }
});
