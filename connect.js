const mysql = require('mysql');
var con = mysql.createConnection({
    host: "huhmiel.heliohost.org",
    user: "huhmiel",
    password: "SimplonERN@76",
    database: "huhmiel_CoopCafe"
});

module.exports = con;
