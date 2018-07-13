const express = require('express');
//const mysql = require('mysql');
const con = require('./connect');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const moment = require('moment');
let app = express();
require('./route')(app);
//require('./moment_fr')(app);
//app.moment.lang('fr');
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(require('serve-static')(__dirname + '/../../public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
    extended: true
}));
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


///moment en fr////////
moment.locale('fr', {
    months: 'janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre'.split('_'),
    monthsShort: 'janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.'.split('_'),
    weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split('_'),
    weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
    weekdaysMin: 'Di_Lu_Ma_Me_Je_Ve_Sa'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        L: 'DD/MM/YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY LT',
        LLLL: 'dddd D MMMM YYYY LT'
    },
    calendar: {
        sameDay: '[Aujourdhui à] LT',
        nextDay: '[Demain à] LT',
        nextWeek: 'dddd [à] LT',
        lastDay: '[Hier à] LT',
        lastWeek: 'dddd [dernier à] LT',
        sameElse: 'L'
    },
    relativeTime: {
        future: 'dans %s',
        past: 'il y a %s',
        s: 'quelques secondes',
        m: 'une minute',
        mm: '%d minutes',
        h: 'une heure',
        hh: '%d heures',
        d: 'un jour',
        dd: '%d jours',
        M: 'un mois',
        MM: '%d mois',
        y: 'une année',
        yy: '%d années'
    },
    ordinal: function (number) {
        return number + (number === 1 ? 'er' : 'ème');
    },
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4 // The week that contains Jan 4th is the first week of the year.
    }
});
moment.locale('fr');

app.get('/', loggedIn, function (req, res) {
    //console.log(req.user.login)
    var {
        google
    } = require('googleapis');
    var privatekey = require("./privatekey.json");

    // configure a JWT auth client
    //var authClient = new googleAuth();
    var jwtClient = new google.auth.JWT(
        privatekey.client_email,
        null,
        privatekey.private_key, ['https://www.googleapis.com/auth/calendar']);
    //authenticate request
    jwtClient.authorize(function (err, tokens) {
        //console.log(tokens)
        var ateliers = [];
        if (err) {
            console.log(err);
            return;
        } else {
            console.log("Successfully connected!");
            //Google Calendar API
            let calendar = google.calendar('v3');
            calendar.events.list({
                auth: jwtClient,
                calendarId: '0mom97cq9vlvktu583504p2560@group.calendar.google.com',
                singleEvents: true,
                orderBy: 'startTime'
            }, function (err, response) {
                //console.log(response.data.items);
                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }
                var events = response.data.items;

                if (events.length == 0) {
                    console.log('No events found.');
                } else {
                    console.log('Event from Google Calendar:');
                    let oneMonthAgo = moment().subtract(1, 'months');
                    let oneMonthAfter = moment().add(1, 'months');
                    //let parser = new DOMParser();
                    for (let event of response.data.items) {
                        let test = moment(event.start.dateTime);
                        if (moment(test).isAfter(oneMonthAgo) && moment(test).isBefore(oneMonthAfter)) {
                            //console.log(event);
                            var agd = `INSERT INTO Agenda(idAgenda, dateStart, dateEnd, agendaNbr) VALUES ('${event.id}', '${event.start.dateTime}', '${event.end.dateTime}', 1) ON DUPLICATE KEY UPDATE agendaNbr = 1`;
                            con.query(agd, function (err, result) {
                                if (err) throw err;
                                console.log('agenda upgraded successfully');

                                //console.log(sqlavis);

                            });
                            let sqlavis = `SELECT * FROM Avis WHERE Agenda_idAgenda = ` + con.escape(event.id);
                            con.query(sqlavis, function (err, resultavis) {
                                if (err) throw err;
                                console.log('avis recupéré');

                                //console.log(ateliers);
                                ateliers.push({
                                    sommaire: event.summary,
                                    location: event.location,
                                    dateStart: moment(event.start.dateTime).format('dddd DD MMMM YYYY HH:mm'),
                                    dateEnd: moment(event.end.dateTime).format('-HH:mm'),
                                    description: event.description,
                                    avis: resultavis
                                })
                            });


                        }
                    }
                    console.log("ATELIERS: ", ateliers);

                }

            });

        }

    });
});

//Lance le server
//let server = app.listen(process.env.PORT || 3000);
let server = app.listen(3002);
///////PASSPORT//////////////

//new local strategie with username and password
passport.use('local', new LocalStrategy({
        username: 'username',
        password: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function (req, username, password, done) { // callback with username and password from our form
        // find a user whose username is the same as the forms username
        // we are checking to see if the user trying to login already exists
        let sql = `SELECT * FROM User WHERE pseudo = ` + con.escape(username);
        con.query(sql, function (err, rows) {
            //con.query(`SELECT * FROM client WHERE login = '${username}'`, function (err, rows) {
            ////console.log("ROWS: ", rows)
            if (err)
                return done(err);
            if (!rows.length) {
                return done(null, false);
            }
            // if the user is found but the password is wrong
            bcrypt.compare(password, rows[0].password, function (err, res) {
                if (err)
                    return done(err);
                if (res == false) {
                    //console.log("bad password")
                    return done(null, false);
                } else {
                    // all is well, return successful user
                    return done(null, rows[0]);
                }
            });
        })
    }))

// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session
// used to serialize the user for the session
passport.serializeUser(function (user, done) {
    done(null, user.idUser);
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
    let sql = `SELECT * FROM User WHERE idUser = ` + con.escape(id);
    con.query(sql, function (err, rows) {
        if (rows.length) {
            done(err, rows[0]);
        } else {
            res.redirect('/login');
        }
    });
});

//////////GESTION LOGIN////////////
app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        var {
            google
        } = require('googleapis');
        var privatekey = require("./privatekey.json");

        // configure a JWT auth client
        //var authClient = new googleAuth();
        var jwtClient = new google.auth.JWT(
            privatekey.client_email,
            null,
            privatekey.private_key, ['https://www.googleapis.com/auth/calendar']);
        //authenticate request
        jwtClient.authorize(function (err, tokens) {
            //console.log(tokens)
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("Successfully connected!");
                //Google Calendar API
                let calendar = google.calendar('v3');
                calendar.events.list({
                    auth: jwtClient,
                    calendarId: '0mom97cq9vlvktu583504p2560@group.calendar.google.com',
                    singleEvents: true,
                    orderBy: 'startTime'
                }, function (err, response) {
                    //console.log(response.data.items);
                    if (err) {
                        console.log('The API returned an error: ' + err);
                        return;
                    }
                    var events = response.data.items;
                    let ateliers = [];
                    if (events.length == 0) {
                        console.log('No events found.');
                    } else {
                        console.log('Event from Google Calendar:');
                        let oneMonthAgo = moment().subtract(1, 'months');
                        let oneMonthAfter = moment().add(1, 'months');
                        //let parser = new DOMParser();
                        for (let event of response.data.items) {
                            let test = moment(event.start.dateTime);
                            if (moment(test).isAfter(oneMonthAgo) && moment(test).isBefore(oneMonthAfter)) {
                                //console.log(event);
                                var agd = `INSERT INTO Agenda(idAgenda, dateStart, dateEnd, agendaNbr) VALUES ('${event.id}', '${event.start.dateTime}', '${event.end.dateTime}', 1) ON DUPLICATE KEY UPDATE agendaNbr = 1`;
                                con.query(agd, function (err, result) {
                                    if (err) throw err;
                                    console.log('user added successfully')
                                });
                                //console.log('EVENTID: ', event.id)
                                ateliers.push({
                                    sommaire: event.summary,
                                    location: event.location,
                                    dateStart: moment(event.start.dateTime).format('dddd DD MMMM YYYY HH:mm'),
                                    dateEnd: moment(event.end.dateTime).format('-HH:mm'),
                                    description: event.description,
                                    id: event.id
                                })
                            }
                        }
                        res.render('index', {
                            atelier: ateliers
                        })
                    }
                });
            }
        });

    });

app.get('/login', function (req, res) {
    //console.log("login page loaded")
    res.render('login', {
        errorMsg: ''
    })
    //}
});

///////////GESTION SIGNIN///////////
app.get('/signin', function (req, res) {
    //console.log("signin page loaded")
    let error = "";
    res.render('signin', {
        errorMsg: error
    });
});

app.post('/signin', function (req, res) {
    //console.log(req.body)
    //Now we check if username already exist, if true we send an error "login already exists"
    con.query(`SELECT * FROM User WHERE mail = '${req.body.usermail}'`, function (err, rows) {
        if (err)
            //return done(err);
            console.log(err)
        if (rows.length) {
            let error = "Adresse Email déja utilisé";
            res.render('signin', {
                errorMsg: error
            })
        } else {
            console.log("we can create user");
            bcrypt.hash(req.body.password, 10, function (err, hash) {
                // Store hash in your password DB.
                var sql = `INSERT INTO User(mail, password, pseudo, codePostal, commune, accordCarte, InteretsDivers, avatar, tel, Ateliers_idAtelier) VALUES ('${req.body.usermail}', '${hash}', '${req.body.username}', '${req.body.zip}', '${req.body.city}', '${req.body.mapask}', '${req.body.interest}', '1', '${req.body.usertel}', '${req.body.atelier}')`;
                con.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log('user added successfully')
                });
            });
            res.redirect('/');
        }
    });
});

//Deconnecte l'utilisateur
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
/////////////PASSPORT END////////////////////

/////////// GESTION DES AVIS ////////////////////
app.post('/addAvis', function (req, res) {
    console.log(req.body)
    let datenow = moment();
    var sql = `INSERT INTO Avis(msg, date, User_idUser, Agenda_idAgenda) VALUES ('${req.body.Textarea}', '${datenow}', '${req.user.idUser}', '${req.body.idAtelier}')`;
    console.log(sql)
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log('avis added successfully')
    });
    //req.logout();
    res.redirect('/');
});

/////////////CALENDAR//////////////////////
// var {
//     google
// } = require('googleapis');
// var privatekey = require("./privatekey.json");

// // configure a JWT auth client
// //var authClient = new googleAuth();
// var jwtClient = new google.auth.JWT(
//     privatekey.client_email,
//     null,
//     privatekey.private_key, ['https://www.googleapis.com/auth/calendar']);
// //authenticate request
// jwtClient.authorize(function (err, tokens) {
//     //console.log(tokens)
//     if (err) {
//         console.log(err);
//         return;
//     } else {
//         console.log("Successfully connected!");
//         //Google Calendar API
//         let calendar = google.calendar('v3');
//         calendar.events.list({
//         //calendar.calendarList.list({
//             auth: jwtClient,
//             calendarId: '0mom97cq9vlvktu583504p2560@group.calendar.google.com',
//             singleEvents: true,
//             orderBy:'startTime'
//         }, function (err, response) {
//             //console.log(response.data.items);
//             if (err) {
//                 console.log('The API returned an error: ' + err);
//                 return;
//             }
//             var events = response.data.items;
//             if (events.length == 0) {
//                 console.log('No events found.');
//             } else {
//                 console.log('Event from Google Calendar:');
//                 let oneMonthAgo = moment().subtract(1, 'months');
//                 let oneMonthAfter = moment().add(1,'months');
//                 let ateliers = [];
//                 for (let event of response.data.items) {
//                     //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

//                     let test = moment(event.start.dateTime)
//                     //console.log("NOW: ",now," TEST: ",test)
//                     if(moment(test).isAfter(oneMonthAgo) && moment(test).isBefore(oneMonthAfter)){
//                         ateliers.push({
//                             sommaire: event.summary,
//                             location: event.location,
//                             dateStart: event.start.dateTime,
//                             dateEnd: event.end.dateTime}
//                         )
//                         //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

//                     }

//                     //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime);
//                 }
//                 // console.log(ateliers);
//                 // res.render('index',{
//                 //     atelier: ateliers
//                 // })
//             }
//         });
//     }
// });

app.get('/', loggedIn, function (req, res) {
    var {
        google
    } = require('googleapis');
    var privatekey = require("./privatekey.json");

    // configure a JWT auth client
    //var authClient = new googleAuth();
    var jwtClient = new google.auth.JWT(
        privatekey.client_email,
        null,
        privatekey.private_key, ['https://www.googleapis.com/auth/calendar']);
    //authenticate request
    jwtClient.authorize(function (err, tokens) {
        //console.log(tokens)
        if (err) {
            console.log(err);
            return;
        } else {
            console.log("Successfully connected!");
            //Google Calendar API
            let calendar = google.calendar('v3');
            calendar.events.list({
                //calendar.calendarList.list({
                auth: jwtClient,
                calendarId: '0mom97cq9vlvktu583504p2560@group.calendar.google.com',
                singleEvents: true,
                orderBy: 'startTime'
            }, function (err, response) {
                //console.log(response.data.items);
                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }
                var events = response.data.items;
                let ateliers = [];
                if (events.length == 0) {
                    console.log('No events found.');
                } else {
                    console.log('Event from Google Calendar:');
                    let oneMonthAgo = moment().subtract(1, 'months');
                    let oneMonthAfter = moment().add(1, 'months');

                    for (let event of response.data.items) {
                        //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

                        let test = moment(event.start.dateTime)
                        //console.log("NOW: ",now," TEST: ",test)
                        if (moment(test).isAfter(oneMonthAgo) && moment(test).isBefore(oneMonthAfter)) {
                            ateliers.push({
                                sommaire: event.summary,
                                location: event.location,
                                dateStart: event.start.dateTime,
                                dateEnd: event.end.dateTime
                            })
                            //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

                        }

                        //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime);
                    }
                    //console.log(ateliers);
                    res.render('index', {
                        atelier: ateliers[0].sommaire
                    })
                }
            });
        }
    });
    //console.log(req.user.login)
    // res.render('index', {
    //     user: req.user.login
    // })
});



// app.get('/profil', function (req, res) {
//     console.log(req)
//     let sqlavis = `SELECT * FROM User WHERE pseudo = 'phil'` ;
//     con.query(sqlavis, function (err, resultavis) {
//         if (err) throw err;
//         console.log(resultavis);
//         res.render('profil', {
//             users: resultavis
//         })

//         //title: 'Express Login'
//     });
// });




//////// GESTION DES COMPETENCES//////////////////////////
//page Modifiez vos Competences
app.get('/comp', function (req, res) {
    res.render('comp')
});

//Reception et traitement des competences
app.post('/comp', function (req, res) {
    let sqldelete = `DELETE FROM note WHERE client_idclientvoter = ${req.user.idclient} AND client_idclientvotant = ${req.user.idclient}`;
    con.query(sqldelete, function (err, result) {
        //console.log(result)
        if (err) throw err;
        //console.log('ancienne notes votée supprimmées');
        //Insere les competences perso
        var sql = `INSERT INTO note (client_idclientvoter, client_idclientvotant, comp_idcomp, note) VALUES 
(${req.user.idclient}, ${req.user.idclient}, 1, ${req.body.comp1}),
(${req.user.idclient}, ${req.user.idclient}, 2, ${req.body.comp2}),
(${req.user.idclient}, ${req.user.idclient}, 3, ${req.body.comp3}),
(${req.user.idclient}, ${req.user.idclient}, 4, ${req.body.comp4}),
(${req.user.idclient}, ${req.user.idclient}, 5, ${req.body.comp5}),
(${req.user.idclient}, ${req.user.idclient}, 6, ${req.body.comp6}),
(${req.user.idclient}, ${req.user.idclient}, 7, ${req.body.comp7}),
(${req.user.idclient}, ${req.user.idclient}, 8, ${req.body.comp8}),
(${req.user.idclient}, ${req.user.idclient}, 9, ${req.body.comp9}),
(${req.user.idclient}, ${req.user.idclient}, 10, ${req.body.comp10})`;
        con.query(sql, function (err, result) {
            if (err) throw err;
            //console.log('note ajoutée');
            res.redirect('/stat')
        });
    });
});

//Affiche la page des votes// page obsolete
app.get('/compVote', function (req, res) {
    if (!req.user.idclient)
        res.redirect('/login');
    var sql = `SELECT * FROM client WHERE login != '${req.user.login}'`;
    con.query(sql, function (err, userlist) {
        res.render('compVote', {
            users: userlist
        })
    });
});

//Recupere les votes et les insert dans la db
app.post('/compVote', function (req, res) {
    console.log("VOTE: ", req.body.idVoted, req.user.idclient)
    let sqldelete = `DELETE FROM note WHERE client_idclientvoter = ${req.body.idVoted} AND client_idclientvotant = ${req.user.idclient}`;
    con.query(sqldelete, function (err, result) {
        if (err) throw err;
        //console.log('ancienne notes votée supprimées');
        let sql = `INSERT INTO note (client_idclientvoter, client_idclientvotant, comp_idcomp, note) VALUES 
(${req.body.idVoted}, ${req.user.idclient}, 1, ${req.body.comp1}),
(${req.body.idVoted}, ${req.user.idclient}, 2, ${req.body.comp2}),
(${req.body.idVoted}, ${req.user.idclient}, 3, ${req.body.comp3}),
(${req.body.idVoted}, ${req.user.idclient}, 4, ${req.body.comp4}),
(${req.body.idVoted}, ${req.user.idclient}, 5, ${req.body.comp5}),
(${req.body.idVoted}, ${req.user.idclient}, 6, ${req.body.comp6}),
(${req.body.idVoted}, ${req.user.idclient}, 7, ${req.body.comp7}),
(${req.body.idVoted}, ${req.user.idclient}, 8, ${req.body.comp8}),
(${req.body.idVoted}, ${req.user.idclient}, 9, ${req.body.comp9}),
(${req.body.idVoted}, ${req.user.idclient}, 10, ${req.body.comp10})`;
        con.query(sql, function (err, result) {
            if (err) throw err;
            //console.log('note votée ajoutée');
            res.redirect('/comparatif');
        });
    });
});

//Recupere les notes perso et les votes sur la db, et les affiche
app.get('/stat', function (req, res) {
    if (!req.user.idclient)
        res.redirect('/login');
    let idclient = req.user.idclient;
    //requete vers notes perso
    let sql = `SELECT * FROM note WHERE client_idclientvoter = ${idclient} AND client_idclientvotant = ${idclient}`;
    //requete vers notes votée
    let sqlVote = `
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 1)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 2)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 3)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 4)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 5)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 6)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 7)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 8)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 9)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 10)`;
    //Lancement des requetes
    let compArr;
    con.query(sql, function (err, result) {
        if (err) throw err;
        ////console.log(result)
        if (result[0]) {
            compArr = [Number(result[0].note),
                Number(result[1].note),
                Number(result[2].note),
                Number(result[3].note),
                Number(result[4].note),
                Number(result[5].note),
                Number(result[6].note),
                Number(result[7].note),
                Number(result[8].note),
                Number(result[9].note)
            ];
        }
        con.query(sqlVote, function (err, result2) {
            //if (err) res.redirect('/comp');//throw err;
            let voteArr = [Number(result2[0].avg),
                Number(result2[1].avg),
                Number(result2[2].avg),
                Number(result2[3].avg),
                Number(result2[4].avg),
                Number(result2[5].avg),
                Number(result2[6].avg),
                Number(result2[7].avg),
                Number(result2[8].avg),
                Number(result2[9].avg)
            ]
            ////console.log(result)
            if (result.length) {
                res.render('stat', {
                    title: "Statistiques",
                    user: req.user.login,
                    dataUser: compArr,
                    dataVote: voteArr
                });
            } else {
                res.redirect('/comp')
            }
        });
    });
});

//Afficher la page Comparatif
app.get('/comparatif', function (req, res) {
    if (!req.user.idclient)
        res.redirect('/login');
    let idclient = req.user.idclient;
    //requete vers notes perso
    let sql = `SELECT * FROM note WHERE client_idclientvoter = ${idclient} AND client_idclientvotant = ${idclient}`;
    //requete vers notes votée
    let sqlVote = `
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 1)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 2)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 3)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 4)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 5)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 6)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 7)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 8)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 9)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 10)`;
    //Lancement des requetes
    let compArr;
    con.query(sql, function (err, result) {
        if (err) throw err;
        if (result[0]) {
            compArr = [Number(result[0].note),
                Number(result[1].note),
                Number(result[2].note),
                Number(result[3].note),
                Number(result[4].note),
                Number(result[5].note),
                Number(result[6].note),
                Number(result[7].note),
                Number(result[8].note),
                Number(result[9].note)
            ];
        }
        con.query(sqlVote, function (err, result2) {
            if (err) throw err;
            let voteArr = [Number(result2[0].avg),
                Number(result2[1].avg),
                Number(result2[2].avg),
                Number(result2[3].avg),
                Number(result2[4].avg),
                Number(result2[5].avg),
                Number(result2[6].avg),
                Number(result2[7].avg),
                Number(result2[8].avg),
                Number(result2[9].avg)
            ]
            var sql = `SELECT * FROM client WHERE login != '${req.user.login}'`;
            con.query(sql, function (err, userlist) {
                if (result.length) {
                    res.render('comparatif', {
                        title: "Compara",
                        user: req.user.login,
                        dataUser: compArr,
                        dataVote: voteArr,
                        users: userlist
                    });
                } else {
                    res.redirect('/comp')
                }
            });
        });
    });
});

app.post('/voir', function (req, res) {
    let tmp = req.body.idVoted.split('|');
    let idclient = tmp[0];
    //requete vers notes perso
    let sql = `SELECT * FROM note WHERE client_idclientvoter = ${idclient} AND client_idclientvotant = ${idclient}`;
    //requete vers notes votée
    let sqlVote = `
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 1)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 2)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 3)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 4)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 5)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 6)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 7)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 8)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 9)
UNION ALL
SELECT AVG(note) AS avg FROM note WHERE ( client_idclientvoter = ${idclient} AND client_idclientvotant != ${idclient} AND comp_idcomp = 10)`;
    //Lancement des requetes
    let compArr;
    con.query(sql, function (err, result) {
        if (err) throw err;
        if (result[0]) {
            compArr = [Number(result[0].note),
                Number(result[1].note),
                Number(result[2].note),
                Number(result[3].note),
                Number(result[4].note),
                Number(result[5].note),
                Number(result[6].note),
                Number(result[7].note),
                Number(result[8].note),
                Number(result[9].note)
            ];
        }
        con.query(sqlVote, function (err, result2) {
            let voteArr = [Number(result2[0].avg),
                Number(result2[1].avg),
                Number(result2[2].avg),
                Number(result2[3].avg),
                Number(result2[4].avg),
                Number(result2[5].avg),
                Number(result2[6].avg),
                Number(result2[7].avg),
                Number(result2[8].avg),
                Number(result2[9].avg)
            ]
            ////console.log(result)
            var sql = `SELECT * FROM client WHERE login != '${req.user.login}'`;
            con.query(sql, function (err, userlist) {
                if (result.length) {

                    res.render('comparatif', {
                        title: "Comparatif",
                        user: tmp[1],
                        dataUser: compArr,
                        dataVote: voteArr,
                        users: userlist
                    });
                } else {
                    res.redirect('/compVote')
                }
            });
        });
    });
});
/////////// FUNCTION //////////////
//check if user is logged in
function loggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        //res.redirect('/indexNotLogged');
        var {
            google
        } = require('googleapis');
        var privatekey = require("./privatekey.json");

        // configure a JWT auth client
        //var authClient = new googleAuth();
        var jwtClient = new google.auth.JWT(
            privatekey.client_email,
            null,
            privatekey.private_key, ['https://www.googleapis.com/auth/calendar']);
        //authenticate request
        jwtClient.authorize(function (err, tokens) {
            //console.log(tokens)
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("Successfully connected!");
                //Google Calendar API
                let calendar = google.calendar('v3');
                calendar.events.list({
                    //calendar.calendarList.list({
                    auth: jwtClient,
                    calendarId: '0mom97cq9vlvktu583504p2560@group.calendar.google.com',
                    singleEvents: true,
                    orderBy: 'startTime'
                }, function (err, response) {
                    //console.log(response.data.items);
                    if (err) {
                        console.log('The API returned an error: ' + err);
                        return;
                    }
                    var events = response.data.items;
                    if (events.length == 0) {
                        console.log('No events found.');
                    } else {
                        console.log('Event from Google Calendar:');
                        let oneMonthAgo = moment().subtract(1, 'months');
                        let oneMonthAfter = moment().add(1, 'months');
                        let ateliers = [];
                        for (let event of response.data.items) {
                            //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

                            let test = moment(event.start.dateTime)
                            //console.log("NOW: ",now," TEST: ",test)
                            if (moment(test).isAfter(oneMonthAgo) && moment(test).isBefore(oneMonthAfter)) {
                                ateliers.push({
                                    sommaire: event.summary,
                                    location: event.location,
                                    dateStart: moment(event.start.dateTime).format('dddd DD MMMM YYYY HH:mm'),
                                    dateEnd: moment(event.end.dateTime).format('-HH:mm')
                                })
                                //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime)

                            }

                            //console.log('Event name: %s, Location: %s, Start date: %s, End date: %s', event.summary, event.location, event.start.dateTime, event.end.dateTime);
                        }
                        console.log(ateliers);
                        res.render('indexNotLogged', {
                            atelier: ateliers
                        })
                    }
                });
            }
        })
    }
}
//////////// SQL ///////////////////////
// //connection parameters
// var con = mysql.createConnection({
//     host: "huhmiel.heliohost.org",
//     user: "huhmiel",
//     password: "SimplonERN@76",
//     database: "huhmiel_CoopCafe"
// });

// //Genere un log lors des erreurs sql
// con.on('error', function (err) {
//     //console.log("[mysql error]", err);
// });

///////////// SQL END ////////////////////