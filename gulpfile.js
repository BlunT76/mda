var gulp = require('gulp');
var compass = require('gulp-compass');
// Requires the gulp-sass plugin
var sass = require('gulp-sass');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var nodemon = require('gulp-nodemon');

var app = './'; // dossier de travail
var destination = './dist'; // dossier à livrer

gulp.task('compass', function () {
    gulp.src('./sass/**/*.scss')
        .pipe(compass({
            config_file: './config.rb',
            css: './dist/public',
            sass: 'sass'
        }))
        //.pipe(gulp.dest('./dist/public'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('img', function () {
    return gulp.src('./img/*.png')
        .pipe(gulp.dest('./dist/public/img'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('ejs', function () {
    return gulp.src('./views/*.ejs')
        .pipe(gulp.dest('./dist/views'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('partials', function () {
    return gulp.src('./partials/*.ejs')
        .pipe(gulp.dest('./dist/partials'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('server', function () {
    return gulp.src('./server.js')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('route', function () {
    return gulp.src('./route.js')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('browserSync', ['nodemon'], function() {
    browserSync.init(null, {
        proxy: "http://localhost:3002", // port of node server
    });
});

gulp.task('nodemon', function (cb) {
    var callbackCalled = false;
    return nodemon({script: './dist/server.js'}).on('start', function () {
        if (!callbackCalled) {
            callbackCalled = true;
            cb();
        }
    });
});

// gulp.task('watch', ['ejs','partials', 'compass', 'img', 'server','route'], function () {
//     gulp.watch('./sass/*.scss', ['compass'])
//     gulp.watch('./views/**/*.ejs', ['ejs'])
//     gulp.watch('./partials/**/*.ejs', ['partials'])
//     gulp.watch('./img/*.png', ['img'])
//     gulp.watch('./server.js', ['server']);
//     gulp.watch('./route.js', ['route']);
//     // Other watchers
// });

gulp.task('watch', ['browserSync', 'server', 'ejs','partials', 'compass', 'img', 'route'], function () {
    gulp.watch(["./server.js"], reload)
    gulp.watch(["./route.js"], reload)
    gulp.watch(["./views/*.ejs"], reload)
    gulp.watch(["./sass/*.scss"], reload)
    gulp.watch(["./partials/*.ejs"], reload)
    gulp.watch(["./img/*.png"], reload);
});