const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

require("dotenv").config();
const algoliasearch = require("algoliasearch");
const axios = require("axios");
const {
  createOrderPayLoadForPickUp,
  createOrderPayLoadForHomeDilevery,
  createLineItemsFromCheckoutLineItems,
} = require("./utils");

const { createOrderAPI } = require("./api");
let finalArrayToSendToAlgolia = [];
const client = algoliasearch(
  process.env.APPLICATION_ID,
  process.env.WRITE_API_KEY
);
const index = client.initIndex("ShopifyProduct");

// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const obj = {
  numProducts: 200,
  endCursor: null,
  hasNextPage: true,
};
exports.fetchData = functions.https.onRequest(async function (
  request,
  response
) {
  while (obj.hasNextPage) {
    try {
      const result = await axios.post(
        "https://halfkg.myshopify.com/api/2022-10/graphql.json",
        {
          query: `query { products(first: ${obj.numProducts} ${
            obj.endCursor ? ' , after: "' + obj.endCursor + '"' : ""
          } ) { pageInfo { hasNextPage endCursor } edges { node { id title createdAt description variants(first: 250) {edges { cursor node { id title price { amount currencyCode } weight available: availableForSale compareAtPrice { amount currencyCode } image { id src: url altText width height } selectedOptions { name value } } } } } } }}`,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token":
              "5d53f8460d89d30e6fa382cb23ab6dc7",
          },
        }
      );
      const arr1 = result.data.data.products.edges.map((product) => {
        product.node.variants = product.node.variants.edges.map((variants) => {
          variants.node.image = variants.node.image?.src;
          return variants.node;
        });
        // console.log(product.node.variants[0]);
        product.node.objectID = product.node.id;
        return product.node;
      });
      finalArrayToSendToAlgolia.push(...arr1);
      obj.hasNextPage = result.data.data.products.pageInfo.hasNextPage;
      obj.endCursor = result.data.data.products.pageInfo.endCursor;
      // console.log(arr1);
    } catch (error) {
      console.log("error");
    }
  }

  // console.log(finalArrayToSendToAlgolia);
  index
    .saveObjects(finalArrayToSendToAlgolia)
    .then(({ objectIDs }) => {
      console.log();
    })
    .catch((error) => {
      console.log(error);
    });
  functions.logger.info("api calling succcccccfullllllllllllllllll!", {
    structuredData: true,
  });
  response.send("api called---Fetch Data Sccessfully---");
});

// CreateOrder Funtion
exports.createOrder = functions.https.onRequest(async function (
  request,
  response
) {
  const body = request.body;
  try {
    // 3. create payload for order
    // var orderPayload = {};
    if (body.pickUp) {
      orderPayload = createOrderPayLoadForPickUp(body.lineItems);
    } else {
      orderPayload = createOrderPayLoadForHomeDilevery(
        body.body.userInfo,
        body.body.lineItems
      );
    }

    // 4.  create order
  const data = const data = await createOrderAPI(orderPayload);
    response.status(200).json({ payload: "Order Placed", data,data });
  } catch (error) {
    response.status(401).json({ payload: error });
  }
});
