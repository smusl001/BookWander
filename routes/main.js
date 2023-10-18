const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function(app, shopData) {

    // Handle our routes
    app.get('/',function(req,res){
        res.render('index.ejs', shopData)
    });
    app.get('/about',function(req,res){
        res.render('about.ejs', shopData);
    });
    app.get('/search',function(req,res){
        res.render("search.ejs", shopData);
    });
    app.get('/search-result', function (req, res) {
        //searching in the database
        //res.send("You searched for: " + req.query.keyword);

        let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + req.query.keyword + "%'"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./'); 
            }
            let newData = Object.assign({}, shopData, {availableBooks:result});
            console.log(newData)
            res.render("list.ejs", newData)
         });        
    });
    app.get('/register', function (req,res) {
        res.render('register.ejs', shopData);                                                                     
    });     
    
    app.post('/registered', function (req, res) {
        const { username, first, last, email, password } = req.body;
        
    
        // Hash the password using bcrypt
        bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
            if (err) {
                // Handle error, e.g., return an error response to the client
                return res.status(500).send('Error hashing password');
            }
    
            // Insert data into the users table
            const insertUserQuery = 'INSERT INTO users (username, first_name, last_name, email, hashedPassword) VALUES (?, ?, ?, ?, ?)';
            const userData = [username, first, last, email, hashedPassword];
    
            // Execute the query to insert user data into the database
            db.query(insertUserQuery, userData, (err, result) => {
                if (err) {
                    // Return an error response to the client
                    return res.status(500).send('Error saving user data');
                }
    
                // Successfully inserted the user into the database
                result = 'Hello '+ req.body.first + ' '+ req.body.last +' you are now registered!  We will send an email to you at ' + req.body.email;
                result += 'Your password is: '+ req.body.password +' and your hashed password is: '+ hashedPassword;
                res.send(result);

            });
        });
    });

    app.get('/listusers', function(req, res) {
        // Query the database to get user details(passwords are not included)
        let sqlquery = "SELECT id, username, first_name, last_name, email FROM users";
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            let userData = Object.assign({}, shopData, { users: result });
            res.render("listusers.ejs", userData);
        });
    });

    app.get('/list', function(req, res) {
        let sqlquery = "SELECT * FROM books"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./'); 
            }
            let newData = Object.assign({}, shopData, {availableBooks:result});
            console.log(newData)
            res.render("list.ejs", newData)
         });
    });

    app.get('/addbook', function (req, res) {
        res.render('addbook.ejs', shopData);
     });
 
     app.post('/bookadded', function (req,res) {
           // saving data in database
           let sqlquery = "INSERT INTO books (name, price) VALUES (?,?)";
           // execute sql query
           let newrecord = [req.body.name, req.body.price];
           db.query(sqlquery, newrecord, (err, result) => {
             if (err) {
               return console.error(err.message);
             }
             else
             res.send(' This book is added to database, name: '+ req.body.name + ' price '+ req.body.price);
             });
       });    

       app.get('/bargainbooks', function(req, res) {
        let sqlquery = "SELECT * FROM books WHERE price < 20";
        db.query(sqlquery, (err, result) => {
          if (err) {
             res.redirect('./');
          }
          let newData = Object.assign({}, shopData, {availableBooks:result});
          console.log(newData)
          res.render("bargains.ejs", newData)
        });
    });       


    app.get('/login', function(req, res) {
        res.render('login.ejs',shopData);
    });


    app.post('/login', function(req, res) {
        const { username, password } = req.body;

        // Query the database to find a user with the provided username
        const getUserQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(getUserQuery, [username], (err, results) => {
            if (err) {
                // Handle database error, e.g., redirect back to login with an error message
                return res.redirect('/loggedin?success=false&error=db');
            }

            // Check if a user with the provided username was found in the database
            if (results.length > 0) {
                const user = results[0];
                const hashedPassword = user.hashedPassword;

                // Compare the password supplied with the password in the database
                bcrypt.compare(password, hashedPassword, function(err, passwordMatch) {
                    if (err) {
                        // Handle bcrypt error, e.g., redirect back to login with an error message
                        return res.redirect('/loggedin?success=false&error=bcrypt');
                    }

                    if (passwordMatch) {
                        // Passwords match, user is authenticated
                        // Redirect to /loggedin with a success message
                        return res.redirect('/loggedin?success=true');
                    } else {
                        // Passwords do not match, user authentication failed
                        // Redirect to /loggedin with a failure message
                        return res.redirect('/loggedin?success=false&error=invalid');
                    }
                });
            } else {
                // User with the provided username was not found in the database
                // Redirect to /loggedin with a failure message
                return res.redirect('/loggedin?success=false&error=notfound');
            }
        });
    });


    app.get('/loggedin', function(req, res) {
        const { success, error } = req.query;

        if (success === 'true') {
            // Display a success message if login was successful
            res.send('Login successful! Welcome to the application.');
        } else if (success === 'false') {
            // Display an error message based on the error parameter
            if (error === 'invalid') {
                res.send('Invalid username or password. Please try again.');
            } else if (error === 'notfound') {
                res.send('User not found. Please register to continue.');
            } else {
                res.send('An error occurred during login. Please try again later.');
            }
        } else {
            // Redirect to the login page if no success parameter is provided
            res.redirect('/login');
        }
    });

}
