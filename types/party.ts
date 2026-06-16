export type BalanceType = "credit" | "debit";
export type PartyType = string;

export interface Party {
  businessName: any;
  id: string;
  name: string;
  userName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
  accountType?: "Saving" | "Current" | "";
  currentBalance?: number;
  openingBalance?: number;
  balanceType: BalanceType;
  partyTypeId: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartyTypeData {
  name: string;
}
