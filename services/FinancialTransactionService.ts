import ApiService from "./ApiService";

export type FinancialTransactionPaymentMode = "cash" | "online";

export interface FinancialTransactionPayload {
  senderPartyId: string;
  senderPartyName: string;
  receiverPartyId: string;
  receiverPartyName: string;
  amount: number;
  paymentMode?: FinancialTransactionPaymentMode;
  transactionDate: string;
  note?: string;
}

const toSchemaPayload = (data: FinancialTransactionPayload) => ({
  senderPartyId: data.senderPartyId,
  senderPartyName: data.senderPartyName,
  receiverPartyId: data.receiverPartyId,
  receiverPartyName: data.receiverPartyName,
  amount: data.amount,
  paymentMode: data.paymentMode,
  transactionDate: data.transactionDate,
  note: data.note || "",
});

const validateTransactionPayload = (data: FinancialTransactionPayload) => {
  if (
    !data?.senderPartyId ||
    !data?.senderPartyName ||
    !data?.receiverPartyId ||
    !data?.receiverPartyName
  ) {
    throw new Error("Sender party and receiver party details are required");
  }

  if (data.senderPartyId === data.receiverPartyId) {
    throw new Error("Sender and receiver parties cannot be same");
  }

  if (!data?.amount) {
    throw new Error("Amount is required");
  }
};

class FinancialTransactionService extends ApiService {
  constructor() {
    super("/financial-transactions");
  }

  async fetchAllTransactions(params?: {
    search?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
    partyId?: string;
  }) {
    return await this.getData("/", { params });
  }

  async createTransaction(data: FinancialTransactionPayload) {
    validateTransactionPayload(data);

    return await this.postData("/", toSchemaPayload(data));
  }

  async getTransactionById(id: string) {
    if (!id) throw new Error("Transaction ID is required");

    return await this.getData(`/${id}`);
  }

  async updateTransaction(
    id: string,
    data: FinancialTransactionPayload,
  ) {
    if (!id) throw new Error("Transaction ID is required");
    validateTransactionPayload(data);

    return await this.putData(`/${id}`, toSchemaPayload(data));
  }

  async deleteTransaction(id: string) {
    if (!id) throw new Error("Transaction ID is required");

    return await this.deleteData(`/${id}`);
  }

  async getTransactionCount() {
    return await this.getData("/count");
  }
}

export default new FinancialTransactionService();
