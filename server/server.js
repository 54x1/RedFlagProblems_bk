const io = require('socket.io')();
const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};

io.on('connection', client => {

  client.on('joinPerks', handleKeydown);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);

  function handleJoinGame(roomName) {
    const room = io.sockets.adapter.rooms[roomName];

    let allUsers;
    if (room) {
      allUsers = room.sockets;
    }

    let numClients = 0;
    if (allUsers) {
      numClients = Object.keys(allUsers).length;
    }

    if (numClients === 0) {
      client.emit('unknownCode');
      return;
    } else if (numClients > 9) {
      client.emit('tooManyPlayers');
      return;
    }

    clientRooms[client.id] = roomName;

    client.join(roomName);
    client.number = 2;
    client.emit('init', 2);

    startGameInterval(roomName);
  }

  function handleNewGame() {
    var length = 6;
    let roomName = makeid(length);
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);

    state[roomName] = initGame();

    client.join(roomName);
    client.number = 1;
    client.emit('init', 1);
    $.getJSON("perks.json",function(data){
        var randIn = Math.floor(Math.random() * (data.perks.length));
        var randIn2 = Math.floor(Math.random() * (data.perks.length));
        var perkData1 = (data.perks[randIn].card);
        var perkData2 = (data.perks[randIn2].card);
        var perks = [perkData1, perkData2];
        client.emit('getPerks', perks)
    });

  }

  function handleKeydown(keyCode) {
    // const roomName = clientRooms[client.id];
    // if (!roomName) {
    //   return;
    // }
    // try {
    //   keyCode = parseInt(keyCode);
    // } catch(e) {
    //   console.error(e);
    //   return;
    // }
    //
    // const vel = getUpdatedVelocity(keyCode);
    //
    // if (vel) {
    //   state[roomName].players[client.number - 1].vel = vel;
    // }
  }
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);

    if (!winner) {
      emitGameState(roomName, state[roomName])
    } else {
      emitGameOver(roomName, winner);
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
  // Send this event to everyone in the room.
  io.sockets.in(room)
    .emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
  io.sockets.in(room)
    .emit('gameOver', JSON.stringify({ winner }));
}

io.listen(process.env.PORT || 3000);
