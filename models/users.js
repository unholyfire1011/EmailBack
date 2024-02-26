const mongoose = require('mongoose');

const Users = new mongoose.Schema({
    name: String,
    mail: String,
    password: String,
    blocked: [
        {
            "User": {type:String}
        }
    ],
    spam: [
        {
            "date": {type: Date},
            "from": {type: String},
            "to": {type: String},
            "msg": {type: Object},
            "file": {type: String}
        }
    ],
    sMessages: [
        {
            "date": {type: Date},
            "to": {type: String},
            "msg": {type: Object},
            "file": {type: String}
        }
    ],
    rMessages: [{
        "date": {type: Date},
        "from" : {type: String},
        "msg": {type: Object},
        "file": {type: String}
    }]
})

const UserModel = mongoose.model('users', Users);

module.exports = UserModel