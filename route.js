module.exports = function (app) {
    const con = require('./connect');

    app.get('/profil', function (req, res) {
        console.log(req.user)
        let sqlavis = `SELECT * FROM User WHERE pseudo = 'phil'`;
        con.query(sqlavis, function (err, resultavis) {
            console.log(resultavis)
            if (err) throw err;
            console.log('avis recupéré');
            res.render('profil', {
                utilisateurs: resultavis[0]
            })
        });
        con.end();
        

        //title: 'Express Login'
    });
};

//other routes..
