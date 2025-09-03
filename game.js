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

  // Unlock audio on first interaction (no scroll design, so document body is fine)
  document.body.addEventListener("click", () => {
    if (!hasInteracted && backgroundMusic) {
      backgroundMusic.play().catch(() => {});
      hasInteracted = true;
    }
  }, { once: true });

  /* =================== Init =================== */
  function initGame() {
    torpedoes = 30;
    shipsSunk = 0;
    isGameOver = false;
    hasStarted = false;

    shipBoard = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    ships.forEach(ship => { ship.hits.clear(); ship.cells = []; });

    boardElement.innerHTML = "";
    shipsListElement.innerHTML = "";
    messageDiv.textContent = "Make your first move!";
    gameOverOverlay.classList.add("hidden");
    board.length = 0;

    createBoard();
    placeShips();
    populateShipList();
    updateTorpedoCount();

    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }

  function createBoard() {
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
  }

  function populateShipList() {
    ships.forEach(ship => {
      const li = document.createElement("li");
      li.textContent = `${ship.name} (${ship.size})`;
      li.id = `ship-${slugify(ship.name)}`;
      shipsListElement.appendChild(li);
    });
  }

  function slugify(name) { return name.replace(/\s+/g, "-"); }

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
          if (shipBoard[r][c]) { positions.length = 0; break; }
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

  /* =================== Firing =================== */
  function fireTorpedo(e) {
    if (typeof torpedoes !== "undefined" && (torpedoes <= 0 || isGameOver)) return;

    if (!hasStarted) {
      backgroundMusic.play().catch(() => {});
      hasStarted = true;
    }

    const cell = e.target;
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    if (cell.classList.contains("hit") || cell.classList.contains("miss")) return;

    torpedoes = Math.max(0, (torpedoes || 0) - 1);
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
    // Visual mark on the clicked cell
    cell.style.backgroundImage = "url('ships/hit.png')";
    cell.style.backgroundSize = "contain";
    cell.style.backgroundRepeat = "no-repeat";
    cell.style.backgroundPosition = "center";

    const ship = ships.find(s => s.name === shipName);
    ship.hits.add(`${row}-${col}`);

    if (ship.hits.size === ship.size) {
      try { triggerSunkEffects(); } catch (e) {}
      shipsSunk++;
      messageDiv.textContent = `${ship.name} has been sunk!`;
      playSound(sunkSound);

      const li = document.getElementById(`ship-${slugify(ship.name)}`);
      if (li) li.classList.add("sunk");

      ship.cells.forEach(id => {
        const [r, c] = id.split("-").map(Number);
        const square = board[r][c];
        if (!square) return;
        square.style.backgroundImage = "url('ships/sunk.png')";
        square.style.backgroundSize = "contain";
        square.style.backgroundRepeat = "no-repeat";
        square.style.backgroundPosition = "center";
        const strike = document.createElement("div");
        strike.className = "red-strike";
        square.appendChild(strike);
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
    cell.style.backgroundImage = "url('ships/miss.png')";
    cell.style.backgroundSize = "contain";
  }

  /* =================== Utils =================== */
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

  /* ===== Sunk Popup (no filename text, title on top, Press Start 2P) ===== */
  function showSunkPopup(shipName, imagePath) {
    const popup = $("sunkPopup");
    const img = $("sunkImage");
    const label = $("sunkShipName");

    if (popup.parentElement !== document.body) document.body.appendChild(popup);

    /* Remove stray text/anchors that could render a tiny filename on the right */
    Array.from(popup.childNodes).forEach(n => { if (n.nodeType === 3) n.remove(); });
    popup.querySelectorAll("a").forEach(a => a.remove());

    /* Reset inline styles that might pin NW */
    img.removeAttribute("style");
    popup.removeAttribute("style");

    /* Title above image, centered */
    if (label) label.textContent = `${shipName} Sunk!`;

    img.src = imagePath;
    img.alt = `${shipName} Sunk`;

    /* Show + fade (container only) */
    popup.classList.remove("hidden");
    popup.style.opacity = "0";
    popup.style.transition = "opacity 0.25s ease";
    requestAnimationFrame(() => { popup.style.opacity = "1"; });

    /* Auto-hide + clear strike lines */
    setTimeout(() => {
      popup.style.opacity = "0";
      setTimeout(() => {
        popup.classList.add("hidden");
        document.querySelectorAll(".red-strike").forEach(el => el.remove());
      }, 250);
    }, 1800);
  }

  function showGameOver(won) {
    isGameOver = true;
    backgroundMusic.pause();
    playSound(won ? winSound : loseSound);
    gameOverOverlay.querySelector("h1").textContent = won ? "VICTORY!" : "GAME OVER";
    gameOverOverlay.classList.remove("hidden");
  }

  /* ===== Effects helpers ===== */
  function triggerSunkEffects() {
    const b = document.getElementById("board");
    if (b) { b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 500); }
    const overlay = document.createElement("div");
    overlay.className = "sunk-overlay";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    setTimeout(() => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    }, 300);
  }

  /* ===== Events ===== */
  resetButton.addEventListener("click", initGame);
  playAgainButton.addEventListener("click", initGame);
  muteButton.addEventListener("click", () => {
    backgroundMusic.muted = !backgroundMusic.muted;
    muteButton.textContent = backgroundMusic.muted ? "Unmute Music" : "Mute Music";
  });

  initGame();
});
