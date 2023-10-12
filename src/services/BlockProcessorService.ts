import {getBalance, getLastBlockNum, sendAllBalance, web3} from "./Web3Service";
import {Pool} from "pg";
import {updateOrder} from "../dao/order";
import Order from "../types/order";
const { createTransport } = require('nodemailer');
import dotenv from "dotenv";
dotenv.config(); //Reads .env file and makes it accessible via process.env

const transporter = createTransport({
    host: process.env.MAILER_HOST, // hostname
    secureConnection: process.env.MAILER_SECURE, // use SSL
    port: process.env.MAILER_PORT, // port for secure SMTP
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD
    }
});

export const processBlocks = async (fromBlock: number, toBlock: number, pool: Pool) => {
    const ordersToWait = await pool.query(`SELECT * FROM orders WHERE status != 'paid'`)
    for (let i = 0; i < ordersToWait.rows.length; i++) {
        const order = ordersToWait.rows[i] as Order
        const ethRecieved = await getBalance(order.wallet, order.atblock)
        if (ethRecieved >= order.sum && order.status === 'pending') {
            order.status = 'confirming'
            await updateOrder(order, pool)
        } else if (order.status === 'confirming') {
            if (Number(toBlock) - order.atblock > 12) {
                order.status = 'paid'
                await updateOrder(order, pool)
                try {
                    await sendAllBalance(ordersToWait.rows[i].walletkey, String(process.env.WALLET))
                    const mailOptions = {
                        from: process.env.MAILER_FROM,
                        to: order.email,
                        subject: `Order Success`,
                        text: `Order ${order.id} succeed`
                    }
                    transporter.sendMail(mailOptions)
                } catch (e) {
                    console.log(e)
                }
            }
        }
    }
    if (ordersToWait.rows.length) {
        const walletsList = ordersToWait.rows.map(order => order.wallet)
        for (let i = fromBlock; i <= toBlock; i++) {
            console.log(`Processing block ${i}`)
            const blockNum = i
            const block = await web3.eth.getBlock(blockNum)
            if (block.transactions && block.transactions.length) {
                for (let i = 0; i < block.transactions.length; i++) {
                    const transaction = await web3.eth.getTransactionFromBlock(block.number, i)
                    if (transaction) {
                        if (walletsList.includes(transaction.to)) {
                            await pool.query(`UPDATE orders SET atblock = ${blockNum} WHERE wallet = '${transaction.to}'`)
                        }
                    }
                }
            }
            await pool.query(`UPDATE settings SET svalue = '${i}' WHERE skey = 'last_block_processed'`)
        }
    } else {
        await pool.query(`UPDATE settings SET svalue = '${toBlock}' WHERE skey = 'last_block_processed'`)
    }
    setTimeout(() => {
        startBlockProcessor(pool)
    }, 1000)
}

export const startBlockProcessor = async (pool: Pool) => {
    console.log(`Processing blocks`)
    const lastBlockProcessedRes = await pool.query(`SELECT svalue FROM settings WHERE skey = 'last_block_processed'`)
    const lastBlockProcessed = lastBlockProcessedRes.rows.length ? Number(lastBlockProcessedRes.rows[0].svalue) : 0
    if (lastBlockProcessed === 0) {
        await pool.query(`DELETE FROM settings WHERE skey = 'last_block_processed'`)
    }
    if (lastBlockProcessed) {
        const processTo = await getLastBlockNum()
        console.log(`Processing blocks from ${lastBlockProcessed} to ${processTo}`)
        if (processTo > lastBlockProcessed) {
            await processBlocks(lastBlockProcessed, Number(processTo), pool)
            await pool.query(`UPDATE settings SET svalue = '${processTo}' WHERE skey = 'last_block_processed'`)
        } else {
            setTimeout(() => {
                startBlockProcessor(pool)
            }, 1000)
        }
    } else {
        const lastOrderRes = await pool.query(`SELECT * FROM orders WHERE status = 'pending' AND atblock != 0 ORDER BY id ASC LIMIT 1`)
        if (lastOrderRes.rows.length) {
            await pool.query(`INSERT INTO settings(skey, svalue) VALUES ('last_block_processed', '${lastOrderRes.rows[0].atblock}')`)
        }
        setTimeout(() => {
            startBlockProcessor(pool)
        }, 1000)
    }
}
