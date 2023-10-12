import Product from "./product";
import ProductCartDTO from "../dto/productCartDTO";

export default interface Order {
  id: number|null;
  email: string;
  wallet: string;
  walletKey: string;
  sum: number;
  status: string;
  atblock: number;
  products: ProductCartDTO[];
}
