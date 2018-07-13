module.exports = function(app){

    app.get('/profil', function(req, res){
        
        res.render('profil') 
            
            //title: 'Express Login'
        });
    };

    //other routes..
