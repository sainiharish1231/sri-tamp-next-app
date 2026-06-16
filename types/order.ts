export type OrderType = "purchase" | "sale" | "jobwork" | "transfer";
export type OrderStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "material_received"
  | "material_delivered";
export type RateType = "fixed" | "unfixed";

export interface OrderMaterial {
  metalType: string;
  weight: string;
  rateType: RateType;
  rateValue: string;
  totalAmount: string;
}

export interface Order {
  id?: string;
  orderId: string;
  orderType: OrderType;
  partyId: string;
  orderDate: string;
  materials: OrderMaterial[];
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}
