document.addEventListener("DOMContentLoaded", () => {
    const gridSize = 10;
    const numShips = 5;
    let torpedoes, shipsSunk, isGameOver, hasStarted;
    let hasInteracted = false;

    const ships = [
        { name: "Yamato", size: 5 },
        { name: "USS Arizona", size: 4 },
        { name: "HMS Hood", size: 3 },
        { name: "Bismarck", size: 3 },
        { name: "HMS Prince of Wales", size: 2 }
    ].map(ship => ({ ...ship, hits: new Set(), cells: [] }));

    const shipImages = {
        "Yamato": "ships/yamato.png",
        "USS Arizona": "ships/arizona.png",
        "HMS Hood": "ships/hood.png",
        "Bismarck": "ships/bismarck.png",
        "HMS Prince of Wales": "ships/prince.png"
    };

    const $ = id => document.getElementById(id);

    const boardElement = $("board");
    const messageDiv = $("message");
    const torpedoCountDiv = $("torpedoCount");
    const shipsListElement = $("shipsList");
    const gameOverOverlay = $("gameOverOverlay");
    const resetButton = $("resetButton");
    const muteButton = $("muteButton");
    const playAgainButton = $("playAgainButton");

    const hitSound = $("hitSound");
    const missSound = $("missSound");
    const sunkSound = $("sunkSound");
    const winSound = $("winSound");
    const loseSound = $("loseSound");
    const backgroundMusic = $("backgroundMusic");

    const board = [];
    let shipBoard = [];

    document.body.addEventListener('click', () => {
        if (!hasInteracted && backgroundMusic) {
            backgroundMusic.play().catch(e => console.log("Autoplay blocked:", e));
            hasInteracted = true;
        }
    }, { once: true });

    function initGame() {
        torpedoes = 30;
        shipsSunk = 0;
        isGameOver = false;
        hasStarted = false;

        shipBoard = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
        ships.forEach(ship => {
            ship.hits.clear();
            ship.cells = [];
        });

        boardElement.innerHTML = '';
        shipsListElement.innerHTML = '';
        messageDiv.textContent = 'Make your first move!';
        gameOverOverlay.classList.add('hidden');
        board.length = 0;

        createBoard();
        placeShips();
        populateShipList();
        updateTorpedoCount();

        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }

    function createBoard() {
        console.log("Creating board..."); // Debugging statement
        for (let r = 0; r < gridSize; r++) {
            const row = [];
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener("click", fireTorpedo);
                boardElement.appendChild(cell);
                row.push(cell);
            }
            board.push(row);
        }
        console.log("Board created:", board); // Debugging statement
    }

    function populateShipList() {
        ships.forEach(ship => {
            const li = document.createElement('li');
            li.textContent = `${ship.name} (${ship.size})`;
            li.id = `ship-${slugify(ship.name)}`;
            shipsListElement.appendChild(li);
        });
    }

    function slugify(name) {
        return name.replace(/\s+/g, '-');
    }

    function placeShips() {
        ships.forEach(ship => {
            let placed = false;
            while (!placed) {
                const isHoriz = Math.random() < 0.5;
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);

                if (isHoriz && col + ship.size > gridSize) continue;
                if (!isHoriz && row + ship.size > gridSize) continue;

                const positions = [];

                for (let i = 0; i < ship.size; i++) {
                    const r = isHoriz ? row : row + i;
                    const c = isHoriz ? col + i : col;
                    if (shipBoard[r][c]) {
                        positions.length = 0;
                        break;
                    }
                    positions.push([r, c]);
                }

                if (positions.length === ship.size) {
                    positions.forEach(([r, c]) => {
                        shipBoard[r][c] = ship.name;
                        ship.cells.push(`${r}-${c}`);
                    });
                    placed = true;
                }
            }
        });
    }

    function fireTorpedo(e) {
        if (isGameOver) return;

        if (!hasStarted) {
            backgroundMusic.play().catch(() => {});
            hasStarted = true;
        }

        const cell = e.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (cell.classList.contains("hit") || cell.classList.contains("miss")) return;

        torpedoes--;
        updateTorpedoCount();

        const target = shipBoard[row][col];
        if (target) {
            handleHit(cell, row, col, target);
        } else {
            handleMiss(cell);
        }

        checkGameOver();
    }

    function handleHit(cell, row, col, shipName) {
        cell.classList.add("hit");
        playSound(hitSound);

        const ship = ships.find(s => s.name === shipName);
        ship.hits.add(`${row}-${col}`);

        if (ship.hits.size === ship.size) {
            shipsSunk++;
            messageDiv.textContent = `${ship.name} has been sunk!`;
            playSound(sunkSound);

            $(`ship-${slugify(ship.name)}`).classList.add("sunk");

            ship.cells.forEach(id => {
                const [r, c] = id.split("-").map(Number);
                board[r][c].classList.add("sunk-part");
            });

            showSunkPopup(ship.name, shipImages[ship.name] || "ships/default.png");
        } else {
            messageDiv.textContent = `Direct hit on ${shipName}!`;
        }
    }

    function handleMiss(cell) {
        cell.classList.add("miss");
        messageDiv.textContent = "Miss!";
        playSound(missSound);
    }

    function playSound(sound) {
        if (!sound) return;
        sound.pause();
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }

    function updateTorpedoCount() {
        torpedoCountDiv.textContent = `Torpedoes Remaining: ${torpedoes}`;
    }

    function checkGameOver() {
        if (shipsSunk === numShips) {
            messageDiv.textContent = "All enemy ships sunk! VICTORY!";
            showGameOver(true);
        } else if (torpedoes <= 0) {
            messageDiv.textContent = "Out of torpedoes! Game Over.";
            showGameOver(false);
        }
    }

    function showSunkPopup(shipName, imagePath) {
        const popup = $("sunkPopup");
        $("sunkImage").src = imagePath;
        $("sunkShipName").textContent = `${shipName} Sunk!`;

        popup.classList.remove("hidden");
        popup.style.opacity = 0;
        popup.style.transition = "opacity 0.3s ease-in-out";
        requestAnimationFrame(() => popup.style.opacity = 1);

        setTimeout(() => {
            popup.style.opacity = 0;
            setTimeout(() => popup.classList.add("hidden"), 300);
        }, 2000);
    }

    function showGameOver(won) {
        isGameOver = true;
        backgroundMusic.pause();
        playSound(won ? winSound : loseSound);
        gameOverOverlay.querySelector("h1").textContent = won ? "VICTORY!" : "Game Over";
        gameOverOverlay.classList.remove("hidden");
    }

    function toggleMute() {
        backgroundMusic.muted = !backgroundMusic.muted;
        muteButton.textContent = backgroundMusic.muted ? "Unmute Music" : "Mute Music";
    }

    resetButton.addEventListener('click', initGame);
    playAgainButton.addEventListener('click', initGame);
    muteButton.addEventListener('click', toggleMute);

    initGame();
});