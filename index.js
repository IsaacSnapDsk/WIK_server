require('dotenv').config();
// importing modules
var http = require("http");
var mongoose = require("mongoose");
// const app = express();
// const host = process.env.HOST || "localhost";
var port = process.env.PORT || 3000;
var server = http.createServer();
var io = require("socket.io")(server);
var _a = require("./src/methods/methods")(io), disconnecting = _a.disconnecting, createRoom = _a.createRoom, joinRoom = _a.joinRoom, startGame = _a.startGame, submitBet = _a.submitBet, stopBetting = _a.stopBetting, stopWaiting = _a.stopWaiting, stopPunishing = _a.stopPunishing, submitScores = _a.submitScores, nextRound = _a.nextRound, startHalftime = _a.startHalftime, stopHalftime = _a.stopHalftime;
// const rounds: Round[] = []
//  Grab our password from our env
var password = process.env.MONGO_PASSWORD || 'rejvFe9z0Q7ySNWH';
//  Grab our URL from our env
var url = process.env.MONGO_URL || 'mongodb+srv://wik:<password>@wik.d577biu.mongodb.net/?retryWrites=true&w=majority';
//  Replace the <password> query with our actual password to get the real url
var DB = url.replace("<password>", password);
/// SOCKET CONNECTION
io.on("connection", function (socket) {
    //  When disconnecting, we need to set the bool on this player to say they disconnected
    socket.on('disconnecting', disconnecting);
    socket.on("createRoom", createRoom);
    socket.on("joinRoom", joinRoom);
    socket.on("startGame", startGame);
    socket.on("submitBet", submitBet);
    socket.on("stopBetting", stopBetting);
    socket.on("stopWaiting", stopWaiting);
    socket.on("stopPunishing", stopPunishing);
    socket.on("submitScores", submitScores);
    socket.on("nextRound", nextRound);
    socket.on("startHalftime", startHalftime);
    socket.on("stopHalftime", stopHalftime);
});
mongoose
    .connect(DB)
    .then(function () {
    console.log("Connection successful!");
})
    .catch(function (e) {
    console.log('mongoose error', e);
});
server.listen(port, function () {
    console.log("Server started and running on port ".concat(port));
});
