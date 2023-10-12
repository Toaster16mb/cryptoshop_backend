-- DROP TABLE IF EXISTS order_products;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS settings;
CREATE TABLE IF NOT EXISTS products(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) NULL
);
CREATE TABLE IF NOT EXISTS orders(
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    wallet VARCHAR(255) NOT NULL DEFAULT '',
    walletkey VARCHAR(255) NOT NULL DEFAULT '',
    sum BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(64) NOT NULL DEFAULT 'pending',
    atblock INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS order_products(
    id SERIAL PRIMARY KEY,
    orderId INT NULL,
    productId INT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT
        fk_order
        FOREIGN KEY (orderId)
        REFERENCES orders(id),
    CONSTRAINT
        fk_product
        FOREIGN KEY (productId)
        REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS settings(
    id SERIAL PRIMARY KEY,
    skey VARCHAR(128) NOT NULL,
    svalue VARCHAR(128) NOT NULL
);
INSERT INTO users(
    username,
    password
) VALUES ( 'admin', '712504a72d7eddf1dd9735da81f42009200e7e30919ca80726a6d883517541b3')
    ON CONFLICT(username) DO NOTHING;
