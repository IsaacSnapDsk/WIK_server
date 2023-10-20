const mongoose = require("mongoose");
const { betSchema } = require("./bet");
const { playerSchema } = require('./player');
const { scoreSchema } = require('./score');
import { Bet } from "./bet"
import { Player } from "./player";
import { Score } from "./score";

export interface Round {
    no: number
    kill: boolean
    turn: Turn
    half: boolean
    punishments: number
    winners: Player[]
    bets: Bet[]
    scores: Score[]
}

export enum Turn {
    Betting = 'Betting',
    Waiting = 'Waiting',
    Results = 'Results',
    Final = 'Final'
}

const roundSchema = new mongoose.Schema({
    no: {
        required: true,
        type: Number,
        default: 1,
    },
    kill: {
        type: Boolean
    },
    turn: {
        required: true,
        type: String,
        default: 'Betting',
    },
    half: {
        required: true,
        type: Boolean,
        default: false
    },
    punishments: {
        type: Number,
        default: 0
    },
    winners: [playerSchema],
    bets: [betSchema],
    scores: [scoreSchema],
});

const roundModel = mongoose.model("Round", roundSchema);
module.exports = {
    roundModel: roundModel,
    roundSchema: roundSchema
};