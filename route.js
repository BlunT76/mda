module.exports = function(app){

    app.get('/profil', function(req, res){
        console.log(req);
        
        res.render('profil') 
            
            //title: 'Express Login'
        });
    };

    //other routes..
