import { Bet } from "./bet";
import { Score } from "./score";

const mongoose = require("mongoose");

export interface Player {
    _id: string
    socketId: string
    name: string
    wins: number
    drinks: number
    shots: number
    bb: number
    bets: Bet[]
    scores: Score[]
    punished: boolean
}

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