import ApiService from "./ApiService";

class OrderService extends ApiService {
  constructor() {
    super("/orders");
  }

  fetchAllOrders(options?: any) {
    return this.getData("/", options);
  }
  async fetchAllOrdersCount() {
    return this.getData("/count");
  }
  fetchOrderById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  addNewOrder(data: any, options?: any) {
    return this.postData("/", data, options);
  }

  updateOrder(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  reorderOrder(data: any, options?: any) {
    return this.postData("/reorder", data, options);
  }

  deleteOrder(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new OrderService();
