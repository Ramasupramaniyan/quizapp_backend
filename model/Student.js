const mongoose      = require('mongoose');
const StudentSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String
});

StudentModel    = mongoose.model("student", StudentSchema);
module.exports  = StudentModel;