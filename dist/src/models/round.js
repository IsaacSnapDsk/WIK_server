"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Turn = void 0;
const mongoose = require("mongoose");
const { betSchema } = require("./bet");
const { playerSchema } = require('./player');
const { scoreSchema } = require('./score');
var Turn;
(function (Turn) {
    Turn["Betting"] = "Betting";
    Turn["Waiting"] = "Waiting";
    Turn["Results"] = "Results";
    Turn["Final"] = "Final";
})(Turn || (exports.Turn = Turn = {}));
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
//# sourceMappingURL=round.js.map