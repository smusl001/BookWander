CREATE DATABASE myBookshop;
USE myBookshop;

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    price DECIMAL(5, 2) unsigned,
    genre VARCHAR(50)
);


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    hashedPassword VARCHAR(255) NOT NULL
);


INSERT INTO books (name, price, genre)
VALUES
    ('Database Book', 40.25, 'Technical'),
    ('Node.js Book', 25.00, 'Technical'),
    ('Express Book', 31.99, 'Technical'),
    ('Harry Potter and the Philosopher Stone', 24.99, 'Fantasy'),
    ('Our Missing Hearts', 18.79, 'Romance'),
    ('News of the World', 14.99, 'Historical Fiction'),
    ('The Top Ten', 21.99, 'Fiction'),
    ('White Nights', 12.99, 'Classics'),
    ('Dostoevsky in Love', 18.99, 'Biography'),
    ('Crime and Punishment', 29.99, 'Classics'),
    ('To Sleep in a Sea of Stars', 17.55, 'Science Fiction'),
    ('Children of Time', 22.99, 'Science Fiction');


CREATE USER 'appuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app2027';
GRANT ALL PRIVILEGES ON myBookshop.* TO 'appuser'@'localhost';
