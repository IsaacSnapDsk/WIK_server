require('dotenv').config();



// importing modules
const http = require("http");
const mongoose = require("mongoose");

// const app = express();
// const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;
const server = http.createServer();
var io = require("socket.io")(server);

const {
    disconnecting,
    createRoom,
    joinRoom,
    startGame,
    submitBet,
    stopBetting,
    stopWaiting,
    stopPunishing,
    submitScores,
    nextRound,
    startHalftime,
    stopHalftime
} = require("./src/methods/methods")(io)


// const rounds: Round[] = []

//  Grab our password from our env
const password = process.env.MONGO_PASSWORD

//  Grab our URL from our env
const url = process.env.MONGO_URL

//  Replace the <password> query with our actual password to get the real url
const DB = url.replace("<password>", password)

/// SOCKET CONNECTION
io.on("connection", (socket) => {

    //  When disconnecting, we need to set the bool on this player to say they disconnected
    socket.on('disconnecting', disconnecting)

    socket.on("createRoom", createRoom)

    socket.on("joinRoom", joinRoom)

    socket.on("startGame", startGame)

    socket.on("submitBet", submitBet)

    socket.on("stopBetting", stopBetting)

    socket.on("stopWaiting", stopWaiting)

    socket.on("stopPunishing", stopPunishing)

    socket.on("submitScores", submitScores)

    socket.on("nextRound", nextRound)

    socket.on("startHalftime", startHalftime)

    socket.on("stopHalftime", stopHalftime)
});

mongoose
    .connect(DB)
    .then(() => {
        console.log("Connection successful!");
    })
    .catch((e) => {
        console.log('mongoose error', e);
    });

server.listen(port, () => {
    console.log(`Server started and running on port ${port}`);
});