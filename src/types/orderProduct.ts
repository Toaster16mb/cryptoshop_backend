export default interface OrderProduct {
  id: number|null;
  orderId: string;
  productId: string;
  price: number;
  quantity: number;
}
