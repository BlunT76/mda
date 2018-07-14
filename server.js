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



//Lance le server
//let server = app.listen(process.env.PORT || 3000);
let server = app.listen(3002);


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
                    console.log(ateliers);
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
                    let sql = `SELECT * FROM Avis`;
                        con.query(sql, function (err, result) {
                            if (err) throw err;
                            //console.log('avis added successfully')
                            res.render('index', {
                                atelier: ateliers,
                                user: req.user.pseudo,
                                logged: true,
                                avis: result,
                                ava: req.user.avatar
                            })
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
    console.log(req.body)
    let datenow = moment().format('dddd DD MMMM YYYY HH:mm');
    var sql = `INSERT INTO Avis(msg, date, username, User_idUser, Agenda_idAgenda) VALUES (`+ con.escape(req.body.Textarea)+`, '${datenow}','${req.user.pseudo}', '${req.user.idUser}', '${req.body.idAtelier}')`;
    console.log(sql)
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log('avis added successfully')
    });
    //req.logout();
    res.redirect('/index');
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



/////////// FUNCTION //////////////
//check if user is logged in
//redirige la page profil si user pas connecté
function loggedIn(req, res, next) {
    console.log("LOGGED IN/ ", req.user)
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/profil', loggedIn, function (req, res) {
    console.log("PROFIL: ", req.user)
    let sqlavis = `SELECT * FROM User WHERE pseudo = '${req.user.pseudo}'`;
    con.query(sqlavis, function (err, resultavis) {
        console.log(resultavis)
        if (err) throw err;
        console.log('avis recupéré');
        res.render('profil', {
            utilisateurs: resultavis[0],
            logged: true
        })
    });
});