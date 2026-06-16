export type EnquiryStatus = "pending" | "reviewing" | "approve" | "rejected";

export interface TimelineEntry {
  status: string;
  comment: string;
  updatedAt: any; 
  updatedBy: string;
}

export interface EnquiryTypes {
  id?: string;
  _id?: string;
  productId: string[];
  name: string;
  email: string;
  mobile: string;
  message: string;
  status: EnquiryStatus;
  countryCode: string;
  diallingCode: string;
  trackingId: string;
  products?: any[];
  timeline?: TimelineEntry[];
  createdAt?: string;
  updatedAt?: string;
}