import {Pool} from "pg";
require('dotenv').config();

export const authUser = async (username: string, password: string, pool: Pool) => {
    const sha256 = require('sha256')
    const passHash = sha256(`${process.env.PASSWORD_SALT}${password}`)
    const userRes = await pool.query(`SELECT * FROM users WHERE username='${username}' AND password='${passHash}'`)
    if (userRes.rows.length) {
        const user = userRes.rows[0]
        const token = sha256(`${Math.random()}${process.env.PASSWORD_SALT}${passHash}`)
        await pool.query(`UPDATE users SET session_token='${token}'`)
        return {
            username: user.username,
            token
        }
    } else {
        throw Error('User not found')
    }
}
