const mongoose = require("mongoose");

export interface GameMaster {
    roomId: string
    socketId: string
    secret: string
}

const gameMasterSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
    },
    socketId: {
        type: String,
        required: true,
    },
    secret: {
        type: String,
        required: true,
    },
});

const gameMasterModel = mongoose.model("Game_Master", gameMasterSchema);
module.exports = {
    gameMasterModel: gameMasterModel,
    gameMasterSchema: gameMasterSchema
};