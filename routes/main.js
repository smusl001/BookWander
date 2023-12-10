const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const escapeHtml = require('escape-html');
const cartItems = [];
const axios = require('axios');
const { body } = require('express-validator');


module.exports = function(app, shopData) {

    const redirectLogin = (req, res, next) => {
        if (!req.session.userId ) {
          res.redirect('./login')
        } else { next (); }
    }

    // These are handling the routes.
    app.get('/',function(req,res){
        res.render('index.ejs', shopData)
    });
    app.get('/about',function(req,res){
        res.render('about.ejs', shopData);
    });
    app.get('/search',function(req,res){
        res.render("search.ejs", shopData);
    });

    //This code preventing them from being interpreted as HTML or script elements.
    app.post('/submit-form', [
        body('userInput').escape().trim(),
    ], (req, res) => {
        const sanitizedInput = req.sanitize(req.body.userInput);
        res.send(`User Input: ${sanitizedInput}`);
    });
    
    //This code is for my search result.
    app.get('/search-result', function (req, res) {
        const searchQuery = req.query.query;
        console.log("Search Query:", searchQuery);
    
        let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + searchQuery + "%'";
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                res.redirect('./');
            }
    
            console.log("Search Results:", result);
    
            let newData = Object.assign({}, shopData, { availableBooks: result });
            console.log(newData);
            res.render("list.ejs", newData);
        });
    });
    
    app.get('/register', function (req,res) {
        res.render('register.ejs', { shopData, shopName: shopData.shopName });
    });
    
    //This code is for my register form. 
    app.post('/registered', [
        check('email').isEmail().withMessage('Please include @ in the email address'),
        check('password').isLength({ min: 8 }).withMessage('Your password should be at least 8 characters long'),
        check('username').isLength({ min: 8 }).withMessage('Your username should be at least 8 characters long'),
    ], function (req, res) {
        const errors = validationResult(req);
    
        if (!errors.isEmpty()) {
            // Redirect the user back to the register page if there are validation errors
            return res.render('register.ejs', { shopData, shopName: shopData.shopName, errors: errors.array() });
        }
    
        const { username, first, last, email, password } = req.body;
    
        // The code checks if the username is already in use.
        const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(checkUsernameQuery, [username], (err, usernameResults) => {
            if (err) {
                // Handle the database error
                return res.status(500).send('Error checking username availability');
            }
    
            // The code checks if the username is already taken.
            if (usernameResults.length > 0) {
                return res.render('register.ejs', {
                    shopData,
                    shopName: shopData.shopName,
                    errors: [{ msg: 'Username is already taken. Please choose another username.' }],
                });
            }
    
            // The code checks if the email is already in use.
            const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
            db.query(checkEmailQuery, [email], (err, emailResults) => {
                if (err) {
                    // Handle the database error
                    return res.status(500).send('Error checking email availability');
                }
    
                // Check if the email is already taken
                if (emailResults.length > 0) {
                    return res.render('register.ejs', {
                        shopData,
                        shopName: shopData.shopName,
                        errors: [{ msg: 'Email is already in use. Please choose another email address.' }],
                    });
                }
    
                // This code hash the password using bcrypt.
                bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
                    if (err) {
                        // Handle error, e.g., return an error response to the client
                        return res.status(500).send('Error hashing password');
                    }
    
                    // This code inserts data into the users table.
                    const insertUserQuery = 'INSERT INTO users (username, first_name, last_name, email, hashedPassword) VALUES (?, ?, ?, ?, ?)';
                    const userData = [username, first, last, email, hashedPassword];
    
                    // This code executes the query to insert user data into the database.
                    db.query(insertUserQuery, userData, (err, result) => {
                        if (err) {
                            // This code returns an error response to the client.
                            return res.status(500).send('Error saving user data');
                        }
    
                        // This code let user know that user successfully inserted the user into the database.
                        let responseMsg = 'Hello ' + req.sanitize(first) + ' ' + req.sanitize(last) + ' you are now registered!  We will send an email to you at ' + req.sanitize(email);
                        res.send(responseMsg);
                    });
                });
            });
        });
    });
    
    
    // This code is for listing the users.
    app.get('/listusers', function(req, res) {
        let sqlquery = "SELECT id, username, first_name, last_name, email FROM users";
        db.query(sqlquery, (err, result) => {
            if (err) {
                console.error(err);
                // This code sends an error response to the client.
                return res.status(500).send('Error fetching user data');
            }
            // This code proceeds with rendering the template if there are no errors.
            let userData = Object.assign({}, shopData, { users: result, loggedInUser: req.session.userId });
            res.render("listusers.ejs", userData);
        });
    });
    
    // This code is for listing the books.
    app.get('/list', function(req, res) {
        let sqlquery = "SELECT * FROM books"; 
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

    // This code checks if the admin is adding books.
    app.get('/addbook', redirectLogin, (req, res) => {
        // This code checks if the logged-in user is an admin.
        if (req.session.userId === 'Admin123') {
            // This code renders the addbook.ejs template for admin users.
            res.render('addbook.ejs', shopData);
        } else {
            // This code checks if the logged-in user is not an admin, display an error message or redirect as needed.
            res.send('You do not have the necessary permissions to add books.');
        }
    });
    
    // This code checks if the admin is adding books.
    app.post('/bookadded', (req, res) => {
        // This code checks if the logged-in user is an admin.
        if (req.session.userId !== 'Admin123') {
            // This code checks if the logged-in user is not an admin, display an error message or redirect as needed.
            return res.send('You do not have the necessary permissions to add books.');
        }
        let sqlquery = "INSERT INTO books (name, price, genre) VALUES (?, ?, ?)";
        let newrecord = [req.body.name, req.body.price, req.body.genre];
        db.query(sqlquery, newrecord, (err, result) => {
            if (err) {
                return console.error(err.message);
            } else {
                res.send('This book is added to the database, name: ' + req.sanitize(req.body.name) + ' price ' + req.sanitize(req.body.price) + ' genre ' + req.sanitize(req.body.genre));
            }
        });
    });
    
    // This code checks the genre of the books.
    app.get('/booksByGenre', (req, res) => {
        const selectedGenre = req.query.genre;
    
        // This code is for querying the database to get books of the selected genre.
        let sqlquery = "SELECT * FROM books WHERE genre = ?";
        db.query(sqlquery, [selectedGenre], (err, result) => {
            if (err) {
                console.error(err);
                res.redirect('./');
            }
            // This code displays the books of the selected genre.
            let newData = Object.assign({}, shopData, { availableBooks: result });
            res.render("list.ejs", newData);
        });
    });      

    // This code checks if the user logged in.
    app.get('/login', function(req, res) {
        // This code check if the user is already logged in.
        if (req.session.userId) {
            // This code checks if user is already logged in, redirect to another page with a message.
            return res.redirect('/already-logged-in');
        }
        // User is not logged in, rendering the login page.
        res.render('login.ejs', shopData);
    });
    
    app.get('/already-logged-in', function(req, res) {
        res.send('You are already logged in.');
    });
    
    // This code checks if user logged in.
    app.post('/login', function(req, res) {
        const { username, password } = req.body;
    
        // This code querying the database to find a user with the provided username.
        const getUserQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(getUserQuery, [username], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.redirect('/login?error=database');
            }

            if (req.session.userId) {
                // User is already logged in, redirecting to another page.
                return res.redirect('/loggedin?success=true');
            }
    
            // This code checks if a user with the provided username was found in the database.
            if (results.length > 0) {
                const user = results[0];
                const hashedPassword = user.hashedPassword;
    
                // This code compares the password supplied with the password in the database.
                bcrypt.compare(password, hashedPassword, function(err, passwordMatch) {
                    if (err) {
                        console.error('Bcrypt error:', err);
                        return res.redirect('/login?error=bcrypt');
                    }
    
                    if (passwordMatch) {
                        // Passwords match, user is authenticated.
                        // Set the session variable and redirect to home page.
                        req.session.userId = user.username; 
                        req.session.adminPassword = user.hashedPassword; 
                        res.redirect('/loggedin?success=true');
                    } else {
                        // Passwords do not match, user authentication failed.
                        res.redirect('/login?error=invalid');
                    }
                });
            } else {
                // User with the provided username was not found in the database.
                res.redirect('/login?error=notfound');
            }
        });
    });
    
    // This code checks in if the user was logged in or not.
    app.get('/loggedin', function(req, res) {
        const { success, error } = req.query;

        if (success === 'true') {
            // This code displays a success message if login was successful.
            res.send('Login successful! Welcome to the application.');
            req.session.userId = req.body.username;
            
        } else if (success === 'false') {
            // This code displays an error message based on the error parameter.
            if (error === 'invalid') {
                res.send('Invalid username or password. Please try again.');
            } else if (error === 'notfound') {
                res.send('User not found. Please register to continue.');
            } else {
                res.send('An error occurred during login. Please try again later.');
            }
        } else {
            // Redirecting to the login page if no success parameter is provided.
            res.redirect('/login');
        }
    });

    app.get('/deleteuser',redirectLogin, function(req, res) {
        res.render('deleteuser.ejs', shopData);
    });
    
    // This code is for deleting user.
    app.post('/deleteuser', function(req, res) {
        const loggedInUser = req.session.userId; // This code get the username of the logged-in user.
        const { username } = req.body;
    
        // This code checks if the logged-in user has the required permissions.
        if (loggedInUser === 'Admin123') {
            // This code querying the database to find the user with the provided username.
            const deleteUserQuery = 'DELETE FROM users WHERE username = ?';
            db.query(deleteUserQuery, [username], (err, result) => {
                if (err) {
                    return res.redirect('/');
                }
                // This code checks if a user with the provided username was found and deleted in the database.
                if (result.affectedRows > 0) {
                    // User deleted successfully.
                    res.send('User deleted successfully');
                } else {
                    // User with the provided username was not found in the database.
                    res.send('User with the provided username was not found in the database');
                }
            });
        } else {
            // This code checks if the logged-in user does not have the required permissions, display an error message.
            res.send('You do not have the necessary permissions to delete a user.');
        }
    });
    
    app.get('/logout', redirectLogin, (req,res) => {
        req.session.destroy(err => {
        if (err) {
          return res.redirect('./')
        }
        res.send('you are now logged out. <a href='+'./'+'>Home</a>');
        })
    })

    // This code calculates the total price of the books in shopping cart.
    function calculateTotalPrice(cartItems) {
        return cartItems.reduce((total, item) => {
            // This code assuming the price is in the format £X.XX.
            const numericPrice = parseFloat(item.price.replace('£', ''));
            return total + numericPrice;
        }, 0).toFixed(2); // This code ensures the total is formatted to two decimal places.
    }
    
    app.get('/shopping-cart', (req, res) => {
        res.render('shopping-cart', { cartItems, calculateTotalPrice });
    });
    
    // This code is for shopping cart.
    app.post('/add-to-cart', (req, res) => {
        // This code retrieves data from the request body.
        const { name,image, price } = req.body;
    
        // This code adds the item to the cart.
        cartItems.push({ name,image, price });
    
        // This code redirects back to the home page or shopping cart.
        res.redirect('/');
    });

    // This code helps user to remove book from cart.
    app.post('/remove-from-cart', (req, res) => {
        const index = req.body.index;
        if (index >= 0 && index < cartItems.length) {
            cartItems.splice(index, 1);
        }
        res.redirect('/shopping-cart');
    });

    // API
    app.get('/random-number-fact', async (req, res) => {
        try {
            // Make a GET request to the Numbers API
            const response = await axios.get('http://numbersapi.com/random');
            
            // Extract the fact from the API response
            const fact = response.data;

            // Render a view with the fact
            res.render('random-number-fact', { shopData, fact });
        } catch (error) {
            // Handle errors (e.g., log them or render an error page)
            console.error('Error fetching number fact:', error);
            res.status(500).send('Error fetching number fact');
        }
    });

    // API
    app.get('/book-page-fact', (req, res) => {
    res.render('book-page-fact', { shopData, fact: null, error: null });
    });

    app.post('/book-page-fact', async (req, res) => {
        try {
            const pageNumber = parseInt(req.body.pageNumber, 10);

            // This code validates that the input is a number.
            if (isNaN(pageNumber)) {
                // If not a number, render the page with an error message.
                return res.render('book-page-fact', { shopData, fact: null, error: 'Please enter a valid number.' });
            }

            // This code makes a request to the Numbers API with the provided page number.
            const response = await axios.get(`http://numbersapi.com/${pageNumber}`);

            // This code extracts the fact from the API response.
            const fact = response.data;

            // This code renders a view with the fact and page number.
            res.render('book-page-fact', { shopData, fact, pageNumber, error: null });
        } catch (error) {
            // This code handle errors.
            console.error('Error fetching number fact:', error);
            res.status(500).send('Error fetching number fact');
        }
    });
}
