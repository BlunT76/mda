module.exports = function (app) {
    const mysql = require('mysql');
    var con = mysql.createConnection({
        host: "huhmiel.heliohost.org",
        user: "huhmiel",
        password: "SimplonERN@76",
        database: "huhmiel_CoopCafe"
    });

    //Genere un log lors des erreurs sql
    con.on('error', function (err) {
        //console.log("[mysql error]", err);
    });

    app.get('/profil', function (req, res) {
        let sqlavis = `SELECT * FROM User WHERE pseudo = 'phil'`;
        con.query(sqlavis, function (err, resultavis) {
            console.log(resultavis)
            if (err) throw err;
            console.log('avis recupéré');
            res.render('profil', {
                utilisateurs: resultavis[0]
            })
        });
        

        //title: 'Express Login'
    });
};

//other routes..