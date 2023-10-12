import {Request, Response} from "express";
import {Pool} from "pg";
import Order from "../types/order";
import {getProduct} from "./product";
import Wallet from "ethereumjs-wallet";
import {getLastBlockNum} from "../services/Web3Service";

export const getOrders = async (pool: Pool) => {
    const orderRs = await pool.query(`SELECT id, email, wallet, sum, status, atblock FROM orders ORDER BY orders.id DESC`)
    return orderRs.rows
}

export const getOrder = async (id: number, pool: Pool) => {
    const result = await pool.query(`SELECT id, email, wallet, sum, status, atblock FROM orders WHERE id = $1::int`, [id])
    if (result.rows.length) {
        return result.rows[0] as Order
    }
}

export const deleteOrder = async (id: number, pool: Pool) => {
    const orderRs = await pool.query(`DELETE FROM orders WHERE id = $1::int`, [id])
    return orderRs.rows
}

export const addOrder = async (order: Order, request: Request, response: Response, pool: Pool) => {
    await pool.query("BEGIN TRANSACTION;")
    const ethWallet = Wallet.generate()
    try {
        const lastBlockNum = await getLastBlockNum()
        const orderResult = await pool.query(`INSERT INTO orders (email, wallet, walletKey, atblock) VALUES ($1, $2, $3, $4) RETURNING id`, [
            order.email, ethWallet.getAddressString(), ethWallet.getPrivateKeyString(), lastBlockNum
        ])
        if (orderResult.rows[0].id) {
            const orderId = orderResult.rows[0].id
            let orderSum = 0
            for (let i = 0; i < order.products.length; i++) {
                const product = await getProduct(order.products[i].id, pool)
                await pool.query(`INSERT INTO order_products (orderId, productId, quantity, price) VALUES ($1, $2, $3, $4) RETURNING id`, [
                    orderId,
                    product.id,
                    order.products[i].quantity,
                    product.price,
                ])
                orderSum += order.products[i].quantity * product.price
            }
            await pool.query(`UPDATE orders SET sum = $1 WHERE id = $2`, [
                orderSum,
                orderId,
            ])
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
    return await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [
        order.status,
        order.id,
    ])
}
