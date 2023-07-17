const moment = require("moment-timezone");
const Order = require("../../models/orderModel");
const Product = require("../../models/productModel");
const { ObjectId } = require("mongodb");

module.exports = {
  loadingOrdersViews: async (req, res) => {
    try {
      const orderId = req.query.id;

      console.log(orderId, "orderId");
      const order = await Order.findOne({ _id: orderId }).populate({
        path: "products.productId",
        select: "name price image",
      });

      const createdOnIST = moment(order.date)
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY h:mm A");
      order.date = createdOnIST;

      const orderDetails = order.products.map((product) => {
        const images = product.productId.image || []; // Set images to an empty array if it is undefined
        const image = images.length > 0 ? images[0] : ""; // Take the first image from the array if it exists

        return {
          productname: product.productId.productname,
          image: image,
          price: product.productId.price,
          total: product.total,
          quantity: product.quantity,
          status: order.orderStatus,
        };
      });

      const deliveryAddress = {
        name: order.addressDetails.name,
        homeAddress: order.addressDetails.homeAddress,
        city: order.addressDetails.city,
        street: order.addressDetails.street,
        postalCode: order.addressDetails.postalCode,
      };

      const total = order.orderValue + order.couponDiscount;
      const discountAmount = order.couponDiscount;
      const subtotal = order.orderValue;
      const cancellationStatus = order.cancellationStatus;
      console.log(cancellationStatus, "cancellationStatus");

      console.log(subtotal, "subtotal");

      console.log(orderDetails, "orderDetails");
      console.log(deliveryAddress, "deliveryAddress");

      res.render("admin/ordersView", {
        layout: "adminlayout",
        orderDetails: orderDetails,
        deliveryAddress: deliveryAddress,
        subtotal: subtotal,
        total: total,
        discountAmount: discountAmount,
        orderId: orderId,
        orderDate: createdOnIST,
        cancellationStatus: cancellationStatus,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  },

  cancellingOrderByAdmin: async (requestData) => {
    try {
      const orderId = requestData;
      console.log(orderId, "orderidddddddddddddd");
      const id = new ObjectId(orderId);
      console.log(id);

      const canceledOrder = await Order.findById(orderId).exec();
      console.log(canceledOrder, "canceledOrder");

      if (!canceledOrder) {
        console.log("Order not found");
        // Handle error or return appropriate response
        return;
      }

      // Increase the stock count for each product in the canceled order
      for (const orderedProduct of canceledOrder.products) {
        const productId = orderedProduct.productId;
        const quantity = orderedProduct.quantity;

        // Update the product stock count in the database
        await Product.findOneAndUpdate(
          { _id: productId },
          { $inc: { stock: quantity } }
        );
      }

      const updateOrder = await Order.findByIdAndUpdate(
        { _id: new ObjectId(orderId) },
        { $set: { orderStatus: "cancelled", cancellationStatus: "cancelled" } },
        { new: true } // This ensures that the updated document is returned
      ).exec();

      console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

      // Check if the payment method is online and the order value is greater than 0
      if (
        (updateOrder.paymentMethod === "ONLINE" ||
          updateOrder.paymentMethod === "WALLET") &&
        updateOrder.orderValue > 0
      ) {
        // Check if a wallet exists for the user
        const wallet = await Wallet.findOne({
          userId: updateOrder.userId,
        }).exec();

        if (wallet) {
          // Wallet exists, increment the wallet amount
          const updatedWallet = await Wallet.findOneAndUpdate(
            { userId: updateOrder.userId },
            { $inc: { walletAmount: updateOrder.orderValue } },
            { new: true }
          ).exec();

          console.log(updatedWallet, "updated wallet with order value");
        } else {
          // Wallet doesn't exist, create a new wallet with the order value as the initial amount
          const newWallet = new Wallet({
            userId: updateOrder.userId,
            walletAmount: updateOrder.orderValue,
          });

          const createdWallet = await newWallet.save();
          console.log(createdWallet, "created new wallet with order value");
        }
      }

      return updateOrder;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  rejectingCancelOrderByAdmin: async (requestData) => {
    try {
      const orderId = requestData;
      console.log(orderId, "orderidddddddddddddd");
      const updateOrder = await Order.findByIdAndUpdate(
        { _id: new ObjectId(orderId) },
        {
          $set: { orderStatus: "Placed", cancellationStatus: "Not requested" },
        },
        { new: true } // This ensures that the updated document is returned
      ).exec();

      console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

      return updateOrder;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  packingOrderByAdmin: async (requestData) => {
    try {
      const orderId = requestData;
      console.log(orderId, "orderidddddddddddddd");
      const updateOrder = await Order.findByIdAndUpdate(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            orderStatus: "Dispatched",
            cancellationStatus: "Dispatched",
          },
        },
        { new: true } // This ensures that the updated document is returned
      ).exec();

      console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

      return updateOrder;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  deliveredOrderByAdmin: async (requestData) => {
    try {
      const orderId = requestData;
      console.log(orderId, "orderidddddddddddddd");
      const updateOrder = await Order.findByIdAndUpdate(
        { _id: new ObjectId(orderId) },
        { $set: { orderStatus: "Delivered", cancellationStatus: "Delivered" } },
        { new: true } // This ensures that the updated document is returned
      ).exec();

      console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

      return updateOrder;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  returnconfirmedbyadmin: async (requestData) => {
    try {
      const orderId = requestData;
      console.log(orderId, "orderidddddddddddddd");
      const updateOrder = await Order.findByIdAndUpdate(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            orderStatus: "Return confirmed",
            cancellationStatus: "Return confirmed",
          },
        },
        { new: true } // This ensures that the updated document is returned
      ).exec();

      console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

      return updateOrder;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      await Product.find().then((response) => {
        resolve(response);
      });
    });
  },

  getCodCount: () => {
    return new Promise(async (resolve, reject) => {
      let response = await Order.aggregate([
        {
          $unwind: "$orders",
        },
        {
          $match: {
            "orders.paymentMethod": "COD",
          },
        },
      ]);
      resolve(response);
    });
  },

  getOnlineCount: () => {
    return new Promise(async (resolve, reject) => {
      let response = await Order.aggregate([
        {
          $unwind: "$orders",
        },
        {
          $match: {
            "orders.paymentMethod": "razorpay",
          },
        },
      ]);
      resolve(response);
    });
  },
  getOrderByDate: () => {
    return new Promise(async (resolve, reject) => {
      const startDate = new Date();
      await Order.find().then((response) => {
        resolve(response);
      });
    });
  },

  getOrderByCategory: () => {
    return new Promise(async (resolve, reject) => {
      await Order.aggregate([{ $unwind: "$orders" }]).then((response) => {
        const productDetails = response.map((order) => {
          return order.orders.productDetails;
        });

        resolve(productDetails);
      });
    });
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      await cartModel.Order.aggregate([
        { $unwind: "$orders" },
        { $sort: { "orders.createdAt": -1 } },
      ]).then((response) => {
        resolve(response);
      });
    });
  },
};
