const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const moveSuggestion = document.getElementById('moveSuggestion');

// Start camera
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert('Camera access denied or not available.');
    console.error(err);
  });

// 2048 board size and tile positions (adjust as needed)
const boardSize = 4;
const tileSize = canvas.width / boardSize;

// Simple AI logic (move left only, replace later)
function chooseMove(board) {
  // Dummy logic: always move left
  return "SWIPE LEFT";
}

// Extract numbers from the video frame (simplified placeholder)
async function readBoardFromFrame() {
  // Draw video frame to canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let board = [];

  for (let r = 0; r < boardSize; r++) {
    let row = [];
    for (let c = 0; c < boardSize; c++) {
      // Crop tile area from canvas
      const imageData = ctx.getImageData(c * tileSize, r * tileSize, tileSize, tileSize);

      // Create temp canvas for OCR on this tile
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = tileSize;
      tempCanvas.height = tileSize;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);

      // OCR the tile
      const { data: { text } } = await Tesseract.recognize(tempCanvas, 'eng', { tessedit_char_whitelist: '0123456789' });
      const number = parseInt(text.trim()) || 0;

      row.push(number);
    }
    board.push(row);
  }

  return board;
}

// Main loop: capture frame, read board, decide move, update UI
async function mainLoop() {
  const board = await readBoardFromFrame();
  const move = chooseMove(board);
  moveSuggestion.textContent = `Move: ${move}`;

  // Debug: log board to console
  console.table(board);

  setTimeout(mainLoop, 2000); // Repeat every 2 seconds
}

// Start main loop after camera loads
video.onloadedmetadata = () => {
  mainLoop();
};
