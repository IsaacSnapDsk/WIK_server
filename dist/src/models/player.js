"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    socketId: {
        type: String,
    },
    connected: {
        type: Boolean
    },
    wins: {
        type: Number,
        default: 0,
    },
    drinks: {
        type: Number,
        default: 0,
    },
    shots: {
        type: Number,
        default: 0,
    },
    bb: {
        type: Number,
        default: 0,
    },
    bets: {
        type: Array,
        default: [],
    },
    scores: {
        type: Array,
        default: []
    },
    punished: {
        type: Boolean,
        default: false
    },
    bbStock: {
        type: Number,
        default: 1
    },
    usedDoubleShot: {
        type: Boolean,
        default: false
    }
});
const playerModel = mongoose.model("Player", playerSchema);
module.exports = {
    playerModel: playerModel,
    playerSchema: playerSchema
};
//# sourceMappingURL=player.js.map