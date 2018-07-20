const express = require('express');
//const mysql = require('mysql');
const con = require('./connect');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const moment = require('moment');
const mailkey = require('./mailconnect');
const sgMail = require('@sendgrid/mail');
const admin = require('./admin');
sgMail.setApiKey(mailkey);
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



//Lance le server
let server = app.listen(process.env.PORT || 3002);
//let server = app.listen(3002);


///////PASSPORT an LOGIN/SIGNIN //////////////
//req.user.pseudo pour trouver le user en cours
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
        //console.log("USER LOGGED: ", req.user);
        res.redirect('index')
    }
);

app.get('/login', function (req, res) {
    //console.log("login page loaded")
    res.render('login', {
        logged: false
    });
});

///////////GESTION SIGNIN///////////
app.get('/signin', function (req, res) {
    //console.log("signin page loaded")
    let error = "";
    res.render('signin', {
        errorMsg: error,
        logged: false
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
                errorMsg: error,
                logged: false
            })
        } else {
            console.log("we can create user");
            bcrypt.hash(req.body.password, 10, function (err, hash) {
                // Store hash in your password DB.

                var sql = `INSERT INTO User(mail, password, pseudo, codePostal, commune, InteretsDivers, avatar, tel, Ateliers_idAtelier) VALUES (` + con.escape(req.body.usermail) + "," + con.escape(hash) + "," + con.escape(req.body.username) + "," + con.escape(req.body.zip) + "," + con.escape(req.body.city) + "," + con.escape(req.body.interest) + "," + con.escape("1") + "," + con.escape(req.body.usertel) + "," + con.escape(req.body.atelier) + ")";
                console.log(sql)
                con.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log('user added successfully');
                    //console.log(`Inscription d'un nouvel utilisateur`, `${req.body.username}<br>${req.body.usermail}<br>${req.body.usertel}<br>${req.body.zip}<br>${req.body.city}<br>${req.body.atelier}<br>${req.body.interest}`)
                    sendnotif(`Inscription d'un nouvel utilisateur`, `${req.body.username}<br>${req.body.usermail}<br>${req.body.usertel}<br>${req.body.zip}<br>${req.body.city}`)
                    //console.log("RESULT SIGNIN: ", result);
                    let sql = `INSERT INTO Merci(merci,User_idUser) VALUES (0, ${result.insertId})`;
                    con.query(sql, function (err, result) {
                        if (err) throw err;
                        res.redirect('/');
                    });
                });
            });
        }
    });
});

//Deconnecte l'utilisateur
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
/////////////PASSPORT END////////////////////

//////////// GESTION DES PAGES INDEX ///////////////
//Lorsqu'on est deconnecté on affiche la page indexNotLogged.ejs
app.get('/', function (req, res) {
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
                    let oneMonthAgo = moment();
                    let oneMonthAfter = moment().add(2, 'months');
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
                    //console.log(ateliers);
                    res.render('indexNotLogged', {
                        atelier: ateliers,
                        logged: false
                    })
                }
            });
        }
    })
});

//Une fois connecté on affiche la page index.ejs
app.get('/index', loggedIn, function (req, res) {
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
                                console.log('agenda updated successfully')
                            });
                            //console.log('EVENTID: ', event.id)
                            let reserOk = false;
                            if (moment(test).isAfter(moment())) {
                                reserOk = true;
                            }
                            ateliers.push({
                                sommaire: event.summary,
                                location: event.location,
                                dateStart: moment(event.start.dateTime).format('dddd DD MMMM YYYY HH:mm'),
                                dateEnd: moment(event.end.dateTime).format('-HH:mm'),
                                description: event.description,
                                id: event.id,
                                reserverOk: reserOk
                            })
                        }
                    }
                    let sqlAvis = `SELECT * FROM Avis;`;
                    con.query(sqlAvis, function (err, result) {
                        if (err) throw err;
                        //console.log("AVIS: ", result)
                        let sqlMerci = `SELECT * FROM Merci;`;
                        con.query(sqlMerci, function (err, resultMerci) {
                            if (err) throw err;
                            let sqlAvatar = `SELECT idUser, avatar FROM User;`;
                            con.query(sqlAvatar, function (err, resAvatar) {
                                if (err) throw err;
                                console.log("AVATARS: ", resAvatar)
                                res.render('index', {
                                    atelier: ateliers,
                                    user: req.user.pseudo,
                                    logged: true,
                                    avis: result,
                                    ava: resAvatar,
                                    merci: resultMerci
                                })
                            })
                            //console.log("MERCI: ",resultMerci)

                        });

                    });

                }
            });
        }
    });
})
////////////// PAGES INDEX END /////////////

/////////// GESTION DES AVIS ////////////////////

//Envoi des avis vers le serveur et les ajoute dans la table avis
app.post('/addAvis', function (req, res) {
    //console.log(req.body)
    let datenow = moment().format('dddd DD MMMM YYYY HH:mm');
    let sql = `INSERT INTO Avis(msg, date, username, User_idUser, Agenda_idAgenda) VALUES (` + con.escape(req.body.Textarea) + `, '${datenow}','${req.user.pseudo}', '${req.user.idUser}', '${req.body.idAtelier}')`;
    //console.log(sql)
    sendnotif(`Nouvel avis de ${req.user.pseudo} `, `${req.user.pseudo} le ${datenow} <br> ${req.body.Textarea}`)
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log('avis added successfully')
    });
    //req.logout();
    res.redirect('/index');
});
//////////////////////////////////////////////
//////////////GESTION DES MERCI
app.post('/merci', function (req, res) {
    console.log("ID: ",req.body.ID)
    if (req.body.ID == req.user.idUser) {
        console.log("ICIIIIII")
        res.redirect('index');
    } else {
        //console.log("augmenter les merci!!!");
        let sql = `UPDATE Merci SET merci = merci + 1 WHERE User_idUser = ${req.body.ID}`;
        //console.log(sql)
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log('merci added successfully');
            res.redirect('index');
        });
    }
});

/////////////GESTION DE LA CARTE ////////////
app.get('/map', loggedIn, function (req, res) {
    let sqlMap = `SELECT * FROM Carte `;
    con.query(sqlMap, function (err, result) {
        if (err) throw err;
        let arr = JSON.stringify(result);
        //arr.push(result)
        console.log(arr)
        //console.log(JSON.stringify(result));

        //let arr = JSON.stringify(result);
        res.render('map', {
            logged: true,
            usersLocation: arr
        });
    });

});

app.post('/addUserOnMap', function (req, res) {
    //console.log(req.body.location)
    let sqlLocation = `INSERT INTO Carte (idUser, username, lat, lng) VALUES ('${req.user.idUser}', '${req.user.pseudo}', '${req.body.lat}','${req.body.lng}') 
    ON DUPLICATE KEY UPDATE lat = '${req.body.lat}', lng = '${req.body.lng}'`;
    //console.log(sqlLocation)
    con.query(sqlLocation, function (err, result) {
        if (err) throw err;
        //console.log(result);
        res.redirect('map')
    });
});

//////////////RESERVER/////////////
app.post('/reserver', function (req, res) {
    //console.log(JSON.stringify(req.body))
    let corp = JSON.stringify(req.body)
    //console.log("RESERVATION: ", `Demande de reservation: ${corp} par ${req.user.pseudo}`)
    sendnotif('Demande de reservation', `Demande de reservation: ${corp} par ${req.user.pseudo}`)
    res.redirect('index');
});

/////////////CHOIX DES AVATARS ////////////
app.post('/avatar', function (req, res) {
    console.log(req.body)
    let sqlAv = `UPDATE User SET avatar =` + con.escape(req.body.choixAvatar) + ` WHERE idUser = ` + con.escape(req.user.idUser);
    con.query(sqlAv, function (err, result) {
        if (err) throw err;
        //console.log(result);
        res.redirect('profil')
    });
    //console.log(sqlAv)
    //UPDATE Merci SET merci = merci + 1 WHERE User_idUser = ${req.body.ID}
});

/////////////ENVOI DES MAILS //////////////
function sendnotif(subj, texte) {
    console.log("sending mail");
    let msg = {
        to: admin,
        from: 'CoopCafe@maisondelavenir.eu',
        subject: subj,
        text: `Ceci est un message automatique: ${texte}`,
        html: `<strong>Ceci est un message automatique, ne pas répondre</strong><br><p>${texte}</p>`,
    };
    sgMail.send(msg);
}


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



/////////// FUNCTION //////////////
//check if user is logged in
//redirige la page profil si user pas connecté
function loggedIn(req, res, next) {
    //console.log("LOGGED IN/ ", req.user)
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

///////////////// GESTION PROFIL PERSO //////////////////
app.get('/profil', loggedIn, function (req, res) {
    //console.log("PROFIL: ", req.user)
    let sqlavis = `SELECT * FROM User WHERE pseudo = '${req.user.pseudo}'`;
    con.query(sqlavis, function (err, resultProfil) {
        //console.log("resultPROFIL: ",resultProfil);
        if (err) throw err;
        let sqlMerci = `SELECT merci FROM Merci WHERE User_idUser = '${req.user.idUser}'`;
        con.query(sqlMerci, function (err, resultMerci) {
            if (err) throw err;
            //console.log("resultMERCI: ",resultMerci);
            res.render('profil', {
                utilisateurs: resultProfil[0],
                logged: true,
                merci: resultMerci[0]
            })
        });
        //console.log('avis recupéré');

    });
});

////////////////// GESTION PROFIL DES USAGERS //////////////////
app.get('/profilPublic', function (req, res) {

    let sqlprofil = `SELECT * FROM User `;
    con.query(sqlprofil, function (err, resultProfil) {
        //console.log("resultPROFIL: ",resultProfil);
        if (err) throw err;
        let sqlMerci = `SELECT merci FROM Merci WHERE User_idUser = '${req.user.idUser}'`;
        con.query(sqlMerci, function (err, resultMerci) {
            if (err) throw err;
            //console.log("resultMERCI: ",resultMerci);
            res.render('profilPublic', {
                utilisateurs: resultProfil,
                logged: true,
                merci: resultMerci[0],
                user: "none"
            })
        });
        //console.log('avis recupéré');

    });
});

app.post('/listeProfil', function (req, res) {
    console.log(req.body);
    let sqlprofilconsult = `SELECT * FROM User WHERE idUser =` + con.escape(req.body.profil);
    console.log(req.body.profil);
    con.query(sqlprofilconsult, function (err, resultProfilConsult) {
        if (err) throw err;
        console.log(resultProfilConsult)
        //console.log(utilisateurs)
        
        //console.log(resultProfil)
        let sqlMerci = `SELECT merci FROM Merci WHERE User_idUser = ` + con.escape(req.body.profil);
        con.query(sqlMerci, function (err, resultMerci) {
            if (err) throw err;
            let sqlprofil = `SELECT * FROM User`
            con.query(sqlprofil, function (err, resultProfil) {
                if (err) throw err;
                console.log("resultProfilConsult: ",resultProfilConsult[0])
                res.render('profilPublic', {
                utilisateurs: resultProfil,
                logged: true,
                merci: resultMerci[0],
                user: resultProfilConsult[0]
                })
            });
        });
    });
});

//////////////// AFFICHAGE DES MENTIONS LEGALES //////////////////
app.get('/mention', function (req, res) {
    res.render('mention', {
        logged: true
    })
});




// PAGE POUR LES TEST SQL
app.get('/test', function (req, res) {

    // debut de la partie SQL
    let sqlrequete = `SELECT * FROM User`;
    // <-- la requete au format mysql, la on selectionne tout dans la table User
    con.query(sqlrequete, function (err, result) { // <-- on lance la requete
        if (err) throw err; // <-- si ya une erreur ca plante le server et indique l'erreur (en gros hein sql pas tres bavard)
        console.log(result); // <-- on affiche le resultat de la requete dans le terminal
        // fin de la partie SQL

        //on redirige vers la page test
        res.render('test', {
            logged: true
        });
    });
});