import axios from "axios";
import { CREATE_ORDER_URL } from "./constants";

export const createOrderAPI = async (payload) => {
  return await axios.post(CREATE_ORDER_URL, payload, {
    headers: {
      "X-Shopify-Access-Token": "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",
    },
  });
};
export const fetchCheckoutByCheckoutId = async (checkoutId) => {};
