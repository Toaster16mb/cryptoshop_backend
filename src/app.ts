import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import {Pool} from "pg";
import cors from 'cors';
import Product from "./types/product";
import {addProduct, deleteProduct, getProduct, getProducts, updateProduct} from "./dao/product";
import {addOrder, getOrder} from "./dao/order";
import {getBalance, getLastBlockNum} from "./services/Web3Service";
import {startBlockProcessor} from "./services/BlockProcessorService";
import {authUser} from "./dao/user";
import {checkToken} from "./services/AuthService";

const app = express();
dotenv.config(); //Reads .env file and makes it accessible via process.env
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432")
});
const allowedOrigins = ['http://localhost:8081'];
const options: cors.CorsOptions = {
  origin: allowedOrigins
};
app.use(cors(options));
app.use(express.json());

const connectToDB = async () => {
  try {
    await pool.connect();
  } catch (err) {
    console.log(err);
  }
};

connectToDB();

app.get("/api/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await getProducts(pool)
    res.status(200).json(products)
  } catch (e) {
    res.status(500).json(e)
  }
});

app.post("/api/users/auth", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = await authUser(req.body.username, req.body.password, pool)
    res.status(200).json(userData)
  } catch (e) {
    // throw e
    res.status(400).json(e)
  }
});

app.post("/api/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await checkToken(req, pool)
    const prodResult = await addProduct(req.body as Product, pool)
    res.json(prodResult)
  } catch (e) {
    res.status(401).json(e)
  }
});

app.get("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id)
  try {
    const product = await getProduct(id, pool)
    res.json(product)
  } catch (e) {
    res.status(404).json({
      error: "Product not found"
    })
  }
});

app.get("/api/orders/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id)
  try {
    const order = await getOrder(id, pool)
    res.json(order)
  } catch (e) {
    res.status(404).json({
      "errors": [
        `Order ${id} not found`
      ]
    })
  }
});

app.post("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await checkToken(req, pool)
    const prodResult = await updateProduct({...req.body, id: Number(req.params.id)} as Product, pool)
    res.json(prodResult)
  } catch (e) {
    res.status(400).json(e)
  }
});

app.delete("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await checkToken(req, pool)
    const id = Number(req.params.id)
    const prodResult = deleteProduct(id, pool)
    res.json(prodResult)
  } catch (e) {
    res.status(401).json(e)
  }
});

app.post("/api/checkout", (req: Request, res: Response, next: NextFunction) => {
  addOrder(req.body, req, res, pool)
});

app.get("/api/orders/check/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id)
  try {
    const order = await getOrder(id, pool)
    if (order) {
      const lastBlock = await getLastBlockNum()
      const ethRecieved = await getBalance(order.wallet, order.atblock)
      res.json({
        orderStatus: order.status,
        orderAtBlock: order.atblock,
        lastBlock: Number(lastBlock),
        ethRecieved,
        toFinish: order.sum,
      })
    }
  } catch (e) {
    console.error(e)
    res.status(404).json({
      "errors": [
        `Order ${id} not found`,
      ]
    })
  }
});

startBlockProcessor(pool)

app.listen(process.env.PORT, () => {
  console.log(`Server is running at ${process.env.PORT}`);
});
