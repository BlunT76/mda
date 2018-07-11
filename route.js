module.exports = function(app){

    app.get('/test', function(req, res){
        console.log(req);
        
        res.render('test', {
            
            //title: 'Express Login'
        });
    });

    //other routes..
}