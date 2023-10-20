"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
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
//# sourceMappingURL=game_master.js.map