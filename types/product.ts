export interface Product {
  partiesIds: never[];
  id: string;
  name: string;
  description: string;
  categoryTypeId: string;
  materialId?: string;
  urlkey: string;
  designCode: string;
  supplierIds: string[];
  images: string[];
  productDetail: Record<string, string>;
  status: "draft" | "active" | "archived";
  price?: number;
  stock?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Category {
  id: string;
  name: string;
}

export interface Material {
  id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
}
export interface Supplier {
  address: any;
  id: string;
  name: string;
  businessName?: string;
}

export interface MediaFile {
  id: string;
  uri: string;
  type: "image" | "video";
  name: string;
  isNew?: boolean;
}
