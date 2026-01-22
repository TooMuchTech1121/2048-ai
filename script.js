const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const moveSuggestion = document.getElementById('moveSuggestion');
const flipBtn = document.getElementById('flipBtn');

let flipped = true; // start flipped
let lastMove = null;

// Flip camera preview horizontally (toggle)
function toggleFlip() {
  flipped = !flipped;
  video.style.transform = flipped ? 'scaleX(-1)' : 'scaleX(1)';
}
flipBtn.addEventListener('click', toggleFlip);

// Start camera
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert('Camera access denied or not available.');
    console.error(err);
  });

const boardSize = 4;
const tileSize = canvas.width / boardSize;

// --------------- 2048 AI logic ---------------------

function slideLeft(row) {
  row = row.filter(x => x !== 0);

  for (let i = 0; i < row.length - 1; i++) {
    if (row[i] === row[i + 1]) {
      row[i] *= 2;
      row[i + 1] = 0;
    }
  }

  row = row.filter(x => x !== 0);
  while (row.length < 4) row.push(0);
  return row;
}

function moveLeft(board) {
  return board.map(slideLeft);
}

function moveRight(board) {
  return board.map(row => slideLeft(row.slice().reverse()).reverse());
}

function transpose(board) {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
}

function moveUp(board) {
  return transpose(moveLeft(transpose(board)));
}

function moveDown(board) {
  return transpose(moveRight(transpose(board)));
}

function countEmpty(board) {
  return board.reduce((acc, row) => acc + row.filter(x => x === 0).length, 0);
}

// --------------- OCR and main loop ---------------------

async function readBoardFromFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let board = [];

  for (let r = 0; r < boardSize; r++) {
    let row = [];
    for (let c = 0; c < boardSize; c++) {
      // Get tile image data
      let imageData = ctx.getImageData(c * tileSize, r * tileSize, tileSize, tileSize);

      // Create temporary canvas for OCR
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = tileSize;
      tempCanvas.height = tileSize;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);

      // OCR: whitelist digits only, single character mode
      const { data: { text } } = await Tesseract.recognize(
        tempCanvas,
        'eng',
        {
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR
        }
      );

      const num = parseInt(text.trim()) || 0;
      row.push(num);
    }
    board.push(row);
  }

  return board;
}

function chooseMove(board) {
  const moves = {
    "SWIPE LEFT": moveLeft,
    "SWIPE RIGHT": moveRight,
    "SWIPE UP": moveUp,
    "SWIPE DOWN": moveDown
  };

  let bestMove = null;
  let bestScore = -1;

  for (const [name, fn] of Object.entries(moves)) {
    const newBoard = fn(board);
    const score = countEmpty(newBoard);

    if (score > bestScore) {
      bestScore = score;
      bestMove = name;
    }
  }

  return bestMove;
}

function updateMoveSuggestion(newMove) {
  if (newMove !== lastMove) {
    moveSuggestion.textContent = `Move: ${newMove}`;
    moveSuggestion.classList.add('highlight');
    setTimeout(() => {
      moveSuggestion.classList.remove('highlight');
    }, 1000);
    lastMove = newMove;
  }
}

async function mainLoop() {
  const board = await readBoardFromFrame();
  console.table(board); // Debug: see detected board in console
  const move = chooseMove(board);
  updateMoveSuggestion(move);
  setTimeout(mainLoop, 2000);
}

video.onloadedmetadata = () => {
  mainLoop();
};
