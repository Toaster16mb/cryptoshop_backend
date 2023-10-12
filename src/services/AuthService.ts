import {Request} from "express";
import {Pool} from "pg";

export const checkToken = async (req: Request, pool: Pool) => {
    const token = req.headers['x-auth-token']
    if (!token) {
        throw Error('Auth required')
    }
    const userFound = await pool.query(`SELECT id FROM users WHERE session_token=$1`, [
        token,
    ])
    if (!userFound.rows.length) {
        throw Error('Wrong token')
    }
}
