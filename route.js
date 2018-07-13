module.exports = function (app) {

    app.get('/profil', function (req, res) {
        console.log(req)
        let sqlavis = `SELECT * FROM User WHERE pseudo = 'phil'` ;
        con.query(sqlavis, function (err, resultavis) {
            if (err) throw err;
            console.log(resultavis);
            res.render('profil', {
                users: resultavis
            })

            //title: 'Express Login'
        });
    });

}