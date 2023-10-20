"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require('mongoose');
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
//# sourceMappingURL=score.js.map