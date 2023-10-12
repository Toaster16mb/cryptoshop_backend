import {Request, Response} from "express";
import {Pool} from "pg";
import Product from "../types/product";

export const getProducts = async (pool: Pool) => {
    const products = await pool.query('SELECT * FROM products ORDER BY id ASC')
    return products.rows
}

export const getProduct = async (id: number, pool: Pool) => {
    const result = await pool.query(`SELECT * FROM products WHERE id = $1`, [
        id
    ])
    return result.rows[0] as Product
}

export const deleteProduct = async (id: number, pool: Pool) => {
    const result = await pool.query(`DELETE FROM products WHERE id = $1`, [
        id
    ])
    return result.rows
}

export const addProduct = async (product: Product, pool: Pool) => {
    const result = await pool.query(`INSERT INTO products (name, price) VALUES ($1, $2)`, [
        product.name,
        product.price,
    ])
    return result.rows
}

export const updateProduct = async (product: Product, pool: Pool) => {
    const result = await pool.query(`UPDATE products SET name = '${product.name}', price = ${product.price} WHERE id = ${product.id}`)
    return result.rows
}
