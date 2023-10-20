const mongoose = require('mongoose')

export interface Bet {
    playerId: string
    kill: boolean
    type: BetType
    amount: number
}

export enum BetType {
    Drink,
    Shot,
    BB
}

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