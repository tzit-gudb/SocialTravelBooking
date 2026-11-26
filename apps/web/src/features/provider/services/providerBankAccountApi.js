import apiClient from "../../../lib/apiClient";

const providerBankAccountApi = {
  async list() {
    return apiClient.get("/provider/bank-accounts");
  },

  async create(payload) {
    return apiClient.post("/provider/bank-accounts", payload);
  },

  async update(id, payload) {
    return apiClient.put(`/provider/bank-accounts/${id}`, payload);
  },

  async setDefault(id) {
    return apiClient.patch(`/provider/bank-accounts/${id}/default`, {});
  },

  async remove(id) {
    return apiClient.delete(`/provider/bank-accounts/${id}`);
  },
};

export default providerBankAccountApi;
