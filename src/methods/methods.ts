
const cryptographer = require('crypto')

import type { Player } from "../models/player";
import type { Room } from "../models/room";


const { playerModel } = require("../models/player");
const { roomModel } = require("../models/room");
const { scoreModel } = require("../models/score");
const { gameMasterModel } = require("../models/game_master")
const { roundModel } = require("../models/round");


const generateSecret = (): String => {
    return cryptographer.randomBytes(64).toString('hex');
}

const generateJoinId = (): String => {
    return Array.from(Array(6), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
}

//  Sets the turn from Waiting to Calculating
const calculateBets = async (room): Promise<Room> => {
    //  Grab our current round
    const round = room.rounds[room.currentRound]

    //  Grab our bets
    const bets = round.bets

    //  Create our array of scores
    const scores = []

    //  Our mapping of bet keys to score keys
    const keyMap = {
        Drink: 'drinks',
        Shot: 'shots',
        BB: 'bb'
    }

    //  Iterate through each vote to compute results
    for (let i = 0; i < bets.length; i++) {
        //  Grab the current bet
        let curr = bets[i]

        //  Our player won if their bet matches the round
        let win = round.kill === curr.kill

        //  Find the player for this bet
        let playerIdx = room.players.findIndex(x => x._id.toString() === curr.playerId)

        //  Convert our type into an actual key of our scores (i.e. Shot to shots)
        let type = keyMap[curr.type]

        //  Create a score for this player based on the win
        //  We default to 0 for every key, and use our Bet's "type" prop to 
        //  0 if we got it right, or the bet's "amount" if we got it wrong
        let score = new scoreModel({
            playerId: curr.playerId,
            drinks: 0,
            shots: 0,
            bb: 0,
        })
        score[type] = win ? 0 : curr.amount

        //  add this score to our array
        scores.push(score)

        //  Add this score to this player's scores
        room.players[playerIdx].scores.push(score)

        //  Add a win to the player if they won this round
        room.players[playerIdx].wins + win ? 1 : 0

        //  The player's "punished" value depends on if they won or not
        room.players[playerIdx].punished = win

        //  Also update the round winners if they won
        if (win) round.winners.push(room.players[playerIdx])
    }

    //  Attach our scores to our round
    round.scores = scores

    //  Update the round for our room
    room.rounds[room.currentRound] = round

    //  SAae the changes
    const savedRoom = room.save()

    //  Return our saved room
    return savedRoom
}

const calculateScores = async (room, io): Promise<Room> => {
    //  Grab our players so we can start processing their scores
    const players = room.players

    //  Iterate through each player so we can start updating their stats
    for (let i = 0; i < players.length; i++) {
        //  Just a ref to the current player
        let player = players[i]

        //  Grab their current stats so we can compare states
        let oldStats = {
            drinks: player.drinks,
            shots: player.shots,
            bb: player.bb
        }

        //  Sum up all of their scores so we can get the new values
        let newStats = player.scores.reduce((prev, curr) => {
            return {
                //  we don't need this to be set but TS is angry
                playerId: '',
                drinks: prev.drinks + curr.drinks,
                shots: prev.shots + curr.shots,
                bb: prev.bb + curr.bb
            }
        })

        //  Compute the difference so we know the punishment to provide
        let diff = {
            playerId: player.id,
            drinks: newStats.drinks - oldStats.drinks,
            shots: newStats.shots - oldStats.shots,
            bb: newStats.bb - oldStats.bb
        }

        //  We know we haven't changed if our stats if our diff is 0 when summing all props
        let noChange = Object.values(diff).reduce((a, b) => a + b, 0) === 0

        //  Regardless, we should notify of a punishment (even if they don't need one, we handle that client-side)
        io.to(player.socketId).emit('punishmentSuccess', diff)

        //  If there's no change, then we can just go to the next player
        if (noChange) continue

        //  Update our player with the new stats
        player.drinks = newStats.drinks
        player.shots = newStats.shots
        player.bb = newStats.bb

        //  Else, we gotta update their stats (order is important, this way newStats takes priority)
        // room.players[i] = { ...player, ...newStats }
        room.players.set(i, player)
    }

    //  Grab our room's current round so we can update the turn we are on
    const round = room.rounds[room.currentRound]
    round.turn = 'Final'

    //  Update our round in the room
    room.rounds[room.currentRound] = round

    //  Now that we're done calculating their new stats, lets save the room to reflect changes
    const savedRoom = await room.save()

    return savedRoom
}

module.exports = (io) => {
    const disconnecting = async function () {
        const socket = this

        //  Find the player matching this socket id
        const player = await playerModel.findOne({ 'socketId': socket.id })

        //  If no player was found, then we're good to just stop
        if (!player) return

        //  Else, we need to say that this player is now disconnected
        player.connected = false

        //  Save the changes to our player
        await player.save()

        //  Find the room this player might be part of
        const room = await roomModel.findOne({ 'players._id': player.id })
        //  If no room exists? we're done
        if (!room) return

        //  Else, update the player in this room too
        const playerIdx = room.players.findIndex((x) => x.id.toString() === player.id.toString())
        room.players[playerIdx] = player

        //  Save our room
        const savedRoom = await room.save()

        //  Let the room know about this
        io.to(room.id.toString()).emit('roomUpdateSuccess', savedRoom)
    }

    const createRoom = async function ({ roomName, maxRounds }) {
        const socket = this
        try {
            //  Generate a random join id
            const joinId = generateJoinId()

            // Create a new room
            const room = new roomModel({
                name: roomName,
                joinId: joinId,
                maxRounds: maxRounds,
                currentRound: 0,
                half: false,
                rounds: []
            });

            //  Grab our room id
            const roomId = room._id.toString();

            //  Create our game master
            const gameMaster = new gameMasterModel({
                socketId: socket.id,
                roomId: roomId,
                secret: generateSecret()
            })

            //  Save our game master
            await gameMaster.save()

            //  Add our game master to the room
            room.gameMaster = gameMaster

            //  Create our first round
            const round = new roundModel({
                no: 1,
                turn: 'Betting',
                bets: [],
                scores: [],
            })

            //  Set our first round in the room
            room.rounds.push(round)

            //  Save our room
            const savedRoom = await room.save();

            //  Subscribe to this room's connection
            socket.join(roomId);
            // io -> send data to everyone
            // socket -> sending data to yourself
            io.to(roomId).emit("createRoomSuccess", savedRoom);
            socket.emit('gameMasterCreatedSuccess', gameMaster)
        } catch (e) {
            console.log(e);
        }
    }

    const joinRoom = async function ({ joinId, nickname }) {
        const socket = this
        try {
            //  Find our room
            const room = await roomModel.findOne({ 'joinId': joinId })

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Please enter a valid join ID.")

            //  Check if our room has a player with this nickname already
            const existing = room.players.find((x: Player) => x.name === nickname)

            /// TODO should we check if the player is disconnected?

            //  If we do, then our player will be the existing one
            //  Else, we found our room so lets create a player to connect to it
            const player = existing ?? new playerModel({
                socketId: socket.id,
                name: nickname,
                connected: true,
            })

            //  If our player did not previously exist, save them and add to the room
            if (!existing) {
                player.save()

                //  Add our player to the room
                room.players.push(player)
            }
            //  Else, we should update the state of this existing player
            else {
                //  Find the actual player for this id
                const actual = await playerModel.findById(existing.id)

                actual.connected = true
                actual.socketId = socket.id
                actual.save()

                //  Replace this player in our room
                const playerIdx = room.players.findIndex((x) => x.id.toString() === actual.id.toString())
                room.players[playerIdx] = actual
            }

            //  Save our room
            const savedRoom = await room.save()

            //  Grab our room's id
            const roomId = room._id.toString()

            //  Subscribe to this room's connection
            socket.join(roomId)

            //  Notify about joining
            io.to(roomId).emit("joinRoomSuccess", savedRoom)

            //  Notify about the new player
            socket.emit("playerCreatedSuccess", player)
        } catch (e) {
            console.log('nahhaha', e)
        }
    }

    const startGame = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Else, set the room to be started
            room.started = true

            //  Save our changes
            const savedRoom = await room.save()

            //  Notify client
            io.to(roomId).emit("startGameSuccess", savedRoom)
        }
        catch (e) {
            console.log("error bitch", e)
        }
    }

    const submitBet = async function ({ roomId, bet }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find the index of the vote for this player
            const playerIdx = room.players.findIndex((x: Player) => x._id.toString() === bet.playerId)
            console.log('player idx', playerIdx)
            //  Find the player matching this bet id
            const player = room.players[playerIdx]

            //  If it isn't found, return an error
            if (!player) return socket.emit("errorOccurred", "Player does not exist.")

            //  Grab our current round
            const round = room.rounds[room.currentRound]

            //  Find the actual player model so we can update them
            const realPlayer = await playerModel.findOne({ '_id': player.id })

            //  Update the player's bets
            realPlayer.bets.push(bet)

            //  If this bet was a BB, decrease from the player's BB stock
            if (bet.type == 'BB') {
                realPlayer.bbStock--
            }
            //  If this bet was a double shot, set their usedDouble to true
            if (bet.type == 'Shot' && bet.amount == 2) {
                console.log('player used double shot', realPlayer)
                realPlayer.usedDoubleShot = true
            }

            //  Adds the player's bet to the round
            round.bets.push(bet)

            //  Update our room
            room.rounds[room.currentRound] = round
            room.players[playerIdx] = player
            const savedRoom = await room.save()

            //  Inform client about bet
            io.to(roomId).emit("betSuccess", savedRoom)

            //  Save the player
            realPlayer.save()

            //  Notify about player updates
            socket.emit('playerCreatedSuccess', realPlayer)

        } catch (e) {
            console.log(`Error posting bet ${e}`)
        }
    }

    /**
     * This occurs after all players submit bets, we just transition the round to "Waiting"
     * and notify the client, which will give the GM the ability to make a decision on whether
     * the clip killed or not.
     * 
     * The next event we will handle will be the "stopWaiting" from the GM
     */
    const stopBetting = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Grab the current round
            const currentRound = room.rounds[room.currentRound]

            //  Update our turn to Waiting
            // currentRound.turn = Turn.Waiting
            currentRound.turn = 'Waiting'

            //  Update the room's current round
            room.rounds[room.currentRound] = currentRound

            //  Save our changes
            room.save()

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", room)
        }
        catch (e) {
            console.log(`Error stopping voting ${e}`)
        }
    }

    /**
    * This occurs after the GM makes a decision on whether the clip killed or not.
    * This will go through each [Bet] made and create 1 [Score] for the [Player] that the
    * [Bet] belongs to, and add it to their [Player.scores] array. Each [Score] will determine
    * the amount for each type ([Score.shots], [Score.drinks], [Score.bb]) based on if the [Bet] was
    * correct, and the [Bet.amount] property. The [Player.wins] also gets updated based on if the
    * [Bet] was correct or not.
    */
    const stopWaiting = async function ({ roomId, gmId, kill }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Grab the current round
            const currentRound = room.rounds[room.currentRound]

            //  Update the round with our kill
            currentRound.kill = kill

            //  Update our turn to Waiting
            // currentRound.turn = Turn.Results
            currentRound.turn = "Results"

            //  Update the room's current round
            room.rounds[room.currentRound] = currentRound

            //  Calculate
            const savedRoom = await calculateBets(room)

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", savedRoom)
        }
        catch (e) {
            console.log(`Error stopping voting ${e}`)
        }
    }

    const stopPunishing = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Calculate our punishments and notify players about these changes
            const savedRoom = await calculateScores(room, io)

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", savedRoom)
        }
        catch (e) {
            console.log(`Error stopping voting ${e}`)
        }
    }

    const submitScores = async function ({ roomId, playerId, scores }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Grab our current round
            const round = room.rounds[room.currentRound]

            for (const score of scores) {
                // Add the score to the round
                round.scores.push(score)

                //  Find the index of the vote for this player
                const playerIdx = room.players.findIndex((x: Player) => x._id.toString() === score.playerId)

                //  Find the player matching this score
                const player = room.players[playerIdx]

                //  Update the player's scores
                player.scores.push(score)

                //  Update our the room and player
                // room.players[playerIdx] = player
                room.players.set(playerIdx, player)
            }

            //  Update the round for our room
            // room.rounds[room.currentRound] = round
            room.rounds.set(room.currentRound, round)

            //  Find the player who sent this request
            const socketPlayerIdx = room.players.findIndex((x: Player) => x._id.toString() === playerId)

            //  Update our player who sent this in
            const socketPlayer = room.players[socketPlayerIdx]
            socketPlayer.punished = false

            //  Update this player in the room
            room.players.set(socketPlayerIdx, socketPlayer)

            //  Save the changes
            const savedRoom = await room.save()

            //  Notify the player
            io.to(roomId).emit('submitScoresSuccess', savedRoom)
        }
        catch (e) {
            console.log(`Error submitting punishment ${e}`)
        }
    }

    const nextRound = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            const round = new roundModel({
                no: room.currentRound + 2,
                turn: 'Betting',
                bets: [],
                scores: [],
            })
            room.rounds.push(round)
            room.currentRound++

            const savedRoom = await room.save()

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", savedRoom)
        }
        catch (e) {
            console.log(`Error changing round ${e}`)
        }
    }

    const startHalftime = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Set half time to true baby
            room.half = true

            //  Save the changes to our room
            const savedRoom = await room.save()

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", savedRoom)
        }
        catch (e) {
            console.log(`Error starting halftime ${e}`)
        }
    }

    const stopHalftime = async function ({ roomId, gmId }) {
        const socket = this
        try {
            //  Grab our current room
            const room = await roomModel.findById(roomId)

            //  If it isn't found, return an error
            if (!room) return socket.emit("errorOccurred", "Room not found.")

            //  Find our game master with this secret
            const gameMaster = await gameMasterModel.findById(gmId)

            //  If it isn't found, return an error
            if (!gameMaster) return socket.emit("errorOccurred", "Game Master not found")

            //  Check if this game master belongs to this room
            const belongs = gameMaster.roomId === roomId

            //  If they dont, return an error
            if (!belongs) return socket.emit("errorOccurred", "Game Master and Room do not match")

            //  Set half time to true baby
            room.half = false

            //  Get our new round
            const round = new roundModel({
                no: room.currentRound + 2,
                turn: 'Betting',
                bets: [],
                scores: [],
            })
            room.rounds.push(round)
            room.currentRound++

            //  Save the changes to our room
            const savedRoom = await room.save()

            //  Return our new room
            io.to(roomId).emit("changeTurnSuccess", savedRoom)
        }
        catch (e) {
            console.log(`Error stopping halftime ${e}`)
        }
    }

    return {
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
    }
}