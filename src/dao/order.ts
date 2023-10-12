import {Request, Response} from "express";
import {Pool} from "pg";
import Order from "../types/order";
import {getProduct} from "./product";
import Wallet from "ethereumjs-wallet";
import {getLastBlockNum} from "../services/Web3Service";

export const getOrders = (request: Request, response: Response, pool: Pool) => {
    pool.query(`SELECT id, email, wallet, sum, status, atblock FROM orders ORDER BY orders.id DESC`, (error, results) => {
        if (error) {
            response.status(500).json(error)
        } else {
            response.status(200).json(results.rows)
        }
    })
}

export const getOrder = async (id: number, pool: Pool) => {
    const result = await pool.query(`SELECT id, email, wallet, sum, status, atblock FROM orders WHERE id = '${id}'`)
    if (result.rows.length) {
        return result.rows[0] as Order
    }
}

export const deleteOrder = (id: number, request: Request, response: Response, pool: Pool) => {
    pool.query(`DELETE FROM orders WHERE id = '${id}'`, (error, results) => {
        if (error) {
            response.status(500).json(error)
        } else {
            response.status(200).json(results)
        }
    })
}

export const addOrder = async (order: Order, request: Request, response: Response, pool: Pool) => {
    await pool.query("BEGIN TRANSACTION;")
    const ethWallet = Wallet.generate()
    try {
        const lastBlockNum = await getLastBlockNum()
        const orderResult = await pool.query(`INSERT INTO orders (email, wallet, walletKey, atblock) VALUES ('${order.email}', '${ethWallet.getAddressString()}', '${ethWallet.getPrivateKeyString()}', ${lastBlockNum}) RETURNING id`)
        if (orderResult.rows[0].id) {
            const orderId = orderResult.rows[0].id
            let orderSum = 0
            for (let i = 0; i < order.products.length; i++) {
                const product = await getProduct(order.products[i].id, pool)
                await pool.query(`INSERT INTO order_products (orderId, productId, quantity, price) VALUES (${orderId}, ${product.id}, ${order.products[i].quantity}, ${product.price}) RETURNING id`)
                orderSum += order.products[i].quantity * product.price
            }
            await pool.query(`UPDATE orders SET sum = ${orderSum} WHERE id = ${orderId}`)
            await pool.query("COMMIT;")
            response.status(201).json({
                orderId
            })
        }
    } catch (e) {
        await pool.query("ROLLBACK;")
        response.status(500).json({
            error: e
        })
    }
}

export const updateOrder = async (order: Order, pool: Pool) => {
    return await pool.query(`UPDATE orders SET status = '${order.status}' WHERE id = ${order.id}`)
}
