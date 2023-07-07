const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const multer = require("multer");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const config = require("../config/config");
const randomstring = require("randomstring");
var path = require("path");
const fs = require("fs");
const accountSid = "AC5b08749806fb17d29e70c46231045f1a";
const authToken = "6244609fd966dac7f208bf06003da851";
const verifySid = "VA881219022be56f5c9c40f5b2b336e929";
const twilio = require("twilio")(accountSid, authToken);
const mongoose = require("mongoose");
const { Console } = require("console");
const ObjectId = mongoose.Types.ObjectId;
const Cart = require("../models/cartModel");
const Address = require("../models/userAddressModel");
const Order = require("../models/orderModel");
const moment = require("moment-timezone");
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_geVs1Kqnz5ziUc",
  key_secret: "CpMAeOoo1SEci1tr6OXJm7pe",
});
module.exports = {
  getProductListForOrders: async (userId) => {
    return new Promise(async (resolve, reject) => {
      const productDetails = await Cart.findOne({ user_id: userId }).lean();
      console.log(productDetails, "productDetails");

      // Calculate the new subtotal for all products in the cart
      const subtotal = productDetails.products.reduce((acc, product) => {
        return acc + product.total;
      }, 0);

      console.log(subtotal, "subtotal");

      const products = productDetails.products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        total: product.total,
      }));
      if (products) {
        resolve(products);
      } else {
        resolve(false);
      }
    });
  },
  getCartValue: (userId) => {
    return new Promise(async (resolve, reject) => {
      const productDetails = await Cart.findOne({ user_id: userId }).lean();
      console.log(productDetails, "productDetails");

      // Calculate the new subtotal for all products in the cart
      const subtotal = productDetails.products.reduce((acc, product) => {
        return acc + product.total;
      }, 0);

      console.log(subtotal, "subtotal");

      if (subtotal) {
        resolve(subtotal);
      } else {
        resolve(false);
      }
    });
  },
  generateRazorpayOrder: (orderId, totalOrderValue) => {
    orderValue = totalOrderValue * 100;
    // To convert paisa into rupees as the Razorpay takes the amount in smallest currency unit (paisa)
    // Amount is in currency subunits. Default currency is INR. Hence, 1 refers to 1 paise, so here the amount is multiplied by 100 to convert it to rupees
    return new Promise((resolve, reject) => {
      let orderDetails = {
        amount: orderValue,
        currency: "INR",
        receipt: orderId,
      };
      console.log(orderDetails, "orderdetailssssssssssssssssssssssssssss");
      instance.orders.create(orderDetails, function (err, orderDetails) {
        if (err) {
          console.log("Order Creation Error from Razorpay: " + err);
        } else {
          resolve(orderDetails);
        }
      });
    });
  },

  verifyOnlinePayment: (paymentData) => {
    // console.log(paymentData);

    return new Promise((resolve, reject) => {
      const crypto = require("crypto"); // Requiring crypto Module here for generating server signature for payments verification

      let razorpaySecretKey = "yg5JyFNX5hUiz5nnVp3xRZjl";

      let hmac = crypto.createHmac("sha256", razorpaySecretKey); // Hashing Razorpay secret key using SHA-256 Algorithm

      hmac.update(
        paymentData["razorpayServerPaymentResponse[razorpay_order_id]"] +
          "|" +
          paymentData["razorpayServerPaymentResponse[razorpay_payment_id]"]
      );
      // Updating the hash (re-hashing) by adding Razprpay payment Id and order Id received from client as response

      let serverGeneratedSignature = hmac.digest("hex");
      // Converted the final hashed result into hexa code and saving it as server generated signature

      let razorpayServerGeneratedSignatureFromClient =
        paymentData["razorpayServerPaymentResponse[razorpay_signature]"];

      if (
        serverGeneratedSignature === razorpayServerGeneratedSignatureFromClient
      ) {
        // Checking that is the signature generated in our server using the secret key we obtained by hashing secretkey,orderId & paymentId is same as the signature sent by the server

        // console.log("Payment Signature Verified");

        resolve();
      } else {
        // console.log("Payment Signature Verification Failed");

        reject();
      }
    });
  },

  updateOnlineOrderPaymentStatus: (ordersCollectionId, onlinePaymentStatus) => {
    return new Promise(async (resolve, reject) => {
      if (onlinePaymentStatus) {
        const orderUpdate = await Order.findByIdAndUpdate(
          { _id: new ObjectId(ordersCollectionId) },
          { $set: { orderStatus: "Placed" } }
        ).then(() => {
          resolve();
        });
      } else {
        const orderUpdate = await Order.findByIdAndUpdate(
          { _id: new ObjectId(ordersCollectionId) },
          { $set: { orderStatus: "Failed" } }
        ).then(() => {
          resolve();
        });
      }
    });
  },
  placingOrder: async (userId, orderData, orderedProducts, totalOrderValue) => {
    let orderStatus =
      orderData["paymentMethod"] === "COD" ? "Placed" : "Pending";

    const defaultAddress = await Address.findOne(
      { user_id: userId, "address.isDefault": true },
      { "address.$": 1 }
    ).lean();
    console.log(defaultAddress, "default address");

    if (!defaultAddress) {
      console.log("Default address not found");
      return res.redirect("/address");
    }

    const defaultAddressDetails = defaultAddress.address[0];
    const address = {
      name: defaultAddressDetails.name,
      mobile: defaultAddressDetails.mobile,
      homeAddress: defaultAddressDetails.homeAddress,
      city: defaultAddressDetails.city,
      street: defaultAddressDetails.street,
      postalCode: defaultAddressDetails.postalCode,
    };
    console.log(address, "address");

    const orderDetails = new Order({
      userId: userId,
      date: Date(),
      orderValue: totalOrderValue,
      paymentMethod: orderData["paymentMethod"],
      orderStatus: orderStatus,
      products: orderedProducts,
      addressDetails: address,
    });

    const placedOrder = await orderDetails.save();

    console.log(placedOrder, "placedOrder");

    // Remove the products from the cart
    await Cart.deleteMany({ user_id: userId });

    let dbOrderId = placedOrder._id.toString();
    console.log(dbOrderId, "order id in stringggggggggggggggggggggggggggg");
    return dbOrderId;
  },
  totalCheckOutAmount: (userId) => {
    try {
      return new Promise((resolve, reject) => {
        Cart.aggregate([
          {
            $match: {
              user: new ObjectId(userId),
            },
          },
          {
            $unwind: "$cartItems",
          },
          {
            $project: {
              item: "$cartItems.productId",
              quantity: "$cartItems.quantity",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "item",
              foreignField: "_id",
              as: "carted",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$carted", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.price"] } },
            },
          },
        ]).then((total) => {
          resolve(total[0]?.total);
        });
      });
    } catch (error) {
      console.log(error.message);
    }
  },
  // totalAmount:(userId)=>{
  //   try
  //   {
  //     const cart = await Cart.findOne({ userId: req.session.user_id })

  // const products = cart.products.map((product) => {
  //   const total = Number(product.quantity) * Number(product.productId.price);
  //   return {
  //     _id: product.productId._id.toString(),
  //     productname: product.productId.productname,
  //     category: product.productId.category.category, // Access the category field directly
  //     image: product.productId.image,
  //     price: product.productId.price,
  //     description: product.productId.description,
  //     quantity: product.quantity,
  //     total,
  //     user_id: req.session.user_id,
  //   };
  // });

  // const total = products.reduce(
  //   (sum, product) => sum + Number(product.total),
  //   0
  // );}
  //   catc (error) {
  //     console.log(error.message);
  //   }
  // }
};
