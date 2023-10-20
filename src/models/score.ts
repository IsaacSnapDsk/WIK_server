const mongoose = require('mongoose')

export interface Score {
    playerId: string
    drinks: number
    shots: number
    bb: number
}

const scoreSchema = new mongoose.Schema({
    playerId: {
        required: true,
        type: String,
    },
    drinks: {
        required: true,
        type: Number,
    },
    shots: {
        required: true,
        type: Number,
    },
    bb: {
        required: true,
        type: Number,
    },
});

const scoreModel = mongoose.model("Score", scoreSchema);
module.exports = {
    scoreModel: scoreModel,
    scoreSchema: scoreSchema
};