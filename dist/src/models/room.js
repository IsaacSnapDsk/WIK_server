"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
//  Grab our schemas
const { gameMasterSchema } = require('./game_master');
const { playerSchema } = require('./player');
const { roundSchema } = require('./round');
const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        default: null
    },
    joinId: {
        type: String,
        required: true,
    },
    maxRounds: {
        type: Number,
        default: 6,
    },
    currentRound: {
        required: true,
        type: Number,
        default: 0,
    },
    half: {
        required: true,
        type: Boolean,
        default: false
    },
    started: {
        required: true,
        type: Boolean,
        default: false,
    },
    gameMaster: gameMasterSchema,
    players: [playerSchema],
    rounds: [roundSchema],
});
const roomModel = mongoose.model("Room", roomSchema);
module.exports = {
    roomModel: roomModel,
    roomSchema: roomSchema
};
//# sourceMappingURL=room.js.map