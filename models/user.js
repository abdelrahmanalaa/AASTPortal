var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema ({
    facebook_id: String,
    registeration_no: String,
    status: String,
    pin_code: String
});


module.exports = mongoose.model("User", userSchema);
