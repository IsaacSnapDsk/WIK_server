"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetType = void 0;
const mongoose = require('mongoose');
var BetType;
(function (BetType) {
    BetType[BetType["Drink"] = 0] = "Drink";
    BetType[BetType["Shot"] = 1] = "Shot";
    BetType[BetType["BB"] = 2] = "BB";
})(BetType || (exports.BetType = BetType = {}));
const betSchema = new mongoose.Schema({
    playerId: {
        required: true,
        type: String,
    },
    kill: {
        required: true,
        type: Boolean,
        default: true,
    },
    type: {
        required: true,
        type: String,
    },
    amount: {
        required: true,
        type: Number,
    }
});
const betModel = mongoose.model("Bet", betSchema);
module.exports = {
    betModel: betModel,
    betSchema: betSchema
};
//# sourceMappingURL=bet.js.map