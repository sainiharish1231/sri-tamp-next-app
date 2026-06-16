export interface Country {
  id: string;
  name: string;
  code: string;
  dialling_code: string;
  flag: string;
  isoCode?: string;
  currency?: string;
  currency_symbol?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CountryResponse {
  success: boolean;
  data: Country[];
  message?: string;
}
