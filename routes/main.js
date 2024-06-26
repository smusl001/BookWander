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
    app.get('/', function(req, res) {
        res.render('index.ejs', { shopData, loggedInUser: req.session.userId, shopName: shopData.shopName });
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
    
        let sqlquery = "SELECT * FROM books WHERE name LIKE ?";
        // execute sql query with parameterized query
        db.query(sqlquery, [`%${searchQuery}%`], (err, result) => {
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
    
    
    app.post('/registered', [
        check('email').isEmail().withMessage('Please enter a valid email address'),
        check('password').isLength({ min: 8 }).withMessage('Your password should be at least 8 characters long'),
        check('username').isLength({ min: 8 }).withMessage('Your username should be at least 8 characters long'),
    ], function (req, res) {
        const errors = validationResult(req);
    
        if (!errors.isEmpty()) {
            // Render the registration form again with error messages
            return res.render('register.ejs', { shopData, shopName: shopData.shopName, errors: errors.array() });
        }
    
        // Sanitize user input to prevent XSS attacks
        const { username, first, last, email, password } = req.body;
    
        // Check if username is already taken
        const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(checkUsernameQuery, [username], (err, usernameResults) => {
            if (err) {
                return res.status(500).send('Error checking username availability');
            }
            if (usernameResults.length > 0) {
                return res.render('register.ejs', {
                    shopData,
                    shopName: shopData.shopName,
                    errors: [{ msg: 'Username is already taken. Please choose another username.' }],
                });
            }
    
            // Check if email is already in use
            const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
            db.query(checkEmailQuery, [email], (err, emailResults) => {
                if (err) {
                    return res.status(500).send('Error checking email availability');
                }
                if (emailResults.length > 0) {
                    return res.render('register.ejs', {
                        shopData,
                        shopName: shopData.shopName,
                        errors: [{ msg: 'Email is already in use. Please choose another email address.' }],
                    });
                }
    
                // Hash the password
                bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
                    if (err) {
                        return res.status(500).send('Error hashing password');
                    }
    
                    // Insert user data into the database
                    const insertUserQuery = 'INSERT INTO users (username, first_name, last_name, email, hashedPassword) VALUES (?, ?, ?, ?, ?)';
                    const userData = [username, first, last, email, hashedPassword];
                    db.query(insertUserQuery, userData, (err, result) => {
                        if (err) {
                            return res.status(500).send('Error saving user data');
                        }
                        // Redirect to the main menu or a confirmation page
                        res.redirect('/registered-success');
                    });
                });
            });
        });
    });
    
    app.get('/registered-success', function (req, res) {
        res.render('registered-success.ejs', { shopData, shopName: shopData.shopName });
    });
    

    app.post('/submit-review', (req, res) => {
        const { userId, bookId, rating, comment } = req.body; // Assuming 'userId' is passed in the request body
    
        // Insert the review into the database
        const insertReviewQuery = 'INSERT INTO reviews (userId, bookId, rating, comment) VALUES (?, ?, ?, ?)';
        db.query(insertReviewQuery, [userId, bookId, rating, comment], (err, result) => {
            if (err) {
                console.error('Error submitting review:', err);
                // Handle the error
                return res.status(500).send('Error submitting review');
            }
            // Redirect back to the user reviews page after successful submission
            res.redirect('/user-reviews');
        });
    });
    

    // Fetch user reviews from the database along with usernames and book titles
    app.get('/user-reviews', (req, res) => {
        // Query to fetch reviews with usernames and book titles
        const query = `
            SELECT reviews.*, users.username, books.name AS bookTitle 
            FROM reviews 
            INNER JOIN users ON reviews.userId = users.id
            INNER JOIN books ON reviews.bookId = books.id
        `;
        db.query(query, (err, reviews) => {
            if (err) {
                console.error('Error fetching reviews:', err);
                res.status(500).send('Error fetching reviews');
            } else {
                // Fetch available books from the database
                db.query('SELECT * FROM books', (err, availableBooks) => {
                    if (err) {
                        console.error('Error fetching available books:', err);
                        res.status(500).send('Error fetching available books');
                    } else {
                        // Fetch users from the database
                        db.query('SELECT * FROM users', (err, users) => {
                            if (err) {
                                console.error('Error fetching users:', err);
                                res.status(500).send('Error fetching users');
                            } else {
                                // Render user-reviews template with reviews, available books, users, and loggedInUser
                                res.render('user-reviews.ejs', { reviews: reviews, availableBooks: availableBooks, users: users, loggedInUser: req.session.userId, shopName: shopData.shopName });
                            }
                        });
                    }
                });
            }
        });
    });



    app.get('/books-you-might-like', (req, res) => {
        // Retrieve the genres from session
        const genresOfCart = req.session.cartGenre || []; // Provide a default value of [] if cartGenre is undefined
        
        // Fetch available books from the database
        db.query('SELECT * FROM books', (err, availableBooks) => {
            if (err) {
                console.error('Error fetching available books:', err);
                return res.status(500).send('Error fetching available books');
            }
    
            // Adding available books to shopData
            shopData.availableBooks = availableBooks;
    
            // Filter available books based on the genres of books in the shopping cart
            const relatedBooks = availableBooks.filter(book => genresOfCart.includes(book.genre));
    
            if (relatedBooks && relatedBooks.length > 0) {
                res.render('books-you-might-like.ejs', { relatedBooks, message: `Related books` });
            } else {
                res.render('books-you-might-like.ejs', { relatedBooks: [], message: `No related books found.` });
            }
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
            // Check if the logged-in user is an admin
            if (req.session.userId !== 'Admin123') {
                return res.send('You do not have the necessary permissions to add books.');
            }
            
            let sqlquery = "INSERT INTO books (name, price, genre, rating) VALUES (?, ?, ?, ?)";
            let newrecord = [req.body.name, req.body.price, req.body.genre, req.body.rating];
            
            db.query(sqlquery, newrecord, (err, result) => {
                if (err) {
                    return console.error(err.message);
                } else {
                    // Redirect to the book-added confirmation page with book details
                    res.render('book-added.ejs', { book: req.body });
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


    app.post('/recommend', (req, res) => {
        const bookId = req.body.bookId;
    
        // Update the recommendation count for the book in the database
        let sqlQuery = "UPDATE books SET recommendations = recommendations + 1 WHERE id = ?";
        db.query(sqlQuery, [bookId], (err, result) => {
            if (err) {
                console.error("Error updating recommendation count:", err);
                res.status(500).send('Error updating recommendation count');
            } else {
                res.redirect('/list');
            }
        });
    });
    
    app.post('/dontrecommend', (req, res) => {
        const bookId = req.body.bookId;
    
        // Update the recommendation count for the book in the database
        let sqlQuery = "UPDATE books SET recommendations = recommendations - 1 WHERE id = ?";
        db.query(sqlQuery, [bookId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error updating recommendation count for the book');
            }
    
            // Redirect back to the book list page
            res.redirect('/list');
        });
    });
    
    
    // This code checks if the user logged in.
    app.get('/login', function(req, res) {
        // Check if the user is already logged in
        if (req.session.userId) {
            // Redirect to another page or handle the case where the user is already logged in
            return res.redirect('/');
        }
        
        // Render the login page, passing loggedInUser and shopName if available
        res.render('login.ejs', { shopData, loggedInUser: req.session.userId, shopName: shopData.shopName });
    });


    app.get('/login-not-success', function (req, res) {
        res.render('login-not-success.ejs');
    });
    
    
    app.post('/login', function(req, res) {
        const { username, password } = req.body;
    
        // Query the database to find a user with the provided username
        const getUserQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(getUserQuery, [username], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                // Render the login-not-success view in case of an error
                return res.render('login-not-success.ejs');
            }
    
            // Check if a user with the provided username was found in the database
            if (results.length > 0) {
                const user = results[0];
                const hashedPassword = user.hashedPassword;
    
                // Compare the password supplied with the password in the database
                bcrypt.compare(password, hashedPassword, function(err, passwordMatch) {
                    if (err) {
                        console.error('Bcrypt error:', err);
                        // Render the login-not-success view in case of an error
                        return res.render('login-not-success.ejs');
                    }
    
                    if (passwordMatch) {
                        // Passwords match, user is authenticated
                        // Set the session variable
                        req.session.userId = user.username;
                        req.session.adminPassword = user.hashedPassword;
    
                        // Redirect the user to the homepage or any other page
                        return res.redirect('/');
                    } else {
                        // Passwords do not match, user authentication failed
                        // Render the login-not-success view for unsuccessful login attempt
                        return res.render('login-not-success.ejs');
                    }
                });
            } else {
                // User with the provided username was not found in the database
                // Render the login-not-success view for unsuccessful login attempt
                return res.render('login-not-success.ejs');
            }
        });
    });
    
    
    app.get('/loggedin', function(req, res) {
        const { success, error } = req.query;
    
        if (success === 'true') {
            // This code displays a success message if login was successful.
            res.send('Login successful! Welcome to the application.');
            // Use req.session.userId directly, as req.body is not available in a GET request.
            // req.session.userId = req.body.username;
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
                // Handle any errors that occur during session destruction
                console.error('Error destroying session:', err);
                return res.status(500).send('Error logging out');
            }
            // Redirect the user to a logout confirmation page
            res.redirect('/logout-confirmation');
        });
    });

    
    app.get('/logout-confirmation', (req, res) => {
        res.render('logout-confirmation.ejs');
    });



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
        const { name, price, genre } = req.body;
    
        // Initialize cartGenre as an array if it doesn't exist
        if (!req.session.cartGenre) {
            req.session.cartGenre = [];
        }
    
        // Add the genre to the array in the session
        req.session.cartGenre.push(genre);
    
        // Add the book to the cart
        cartItems.push({ name, price, genre });
    
        // Redirect back to the home page or shopping cart
        res.redirect('/');
    });
    
    


    // This code helps user to remove book from cart.
    app.post('/remove-from-cart', (req, res) => {
        const index = req.body.index;
        if (index >= 0 && index < cartItems.length) {
            cartItems.splice(index, 1);
            // Redirect back to the shopping cart page
            return res.redirect('/shopping-cart');
        } else {
            // Handle invalid index
            return res.status(400).json({ success: false, message: 'Invalid index' });
        }
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