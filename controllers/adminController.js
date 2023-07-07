const Admin = require("../models/adminModel");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const config = require("../config/config");
const session = require("express-session");
const multer = require("multer");
const bodyParser = require("body-parser");
const moment = require("moment-timezone");

const Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(_dirnae, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploads = multer({ storage: Storage });

///  for loading login pag
const loadLogin = async (req, res) => {
  try {
    res.render("admin/login", { layout: "adminlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });
    console.log(userData);
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_admin === 0) {
          res.render("admin/login", {
            message: "Email and Password are invalid",
            layout: "adminlayout",
          });
        } else {
          req.session.user_id = userData._id;
          res.redirect("/admin/home");
        }
      }
    } else {
      res.render("admin/login", {
        message: "Email and password are invalid",
        layout: "adminlayout",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    // const UserData = await User.findById({ _id: req.session.user_id });
    // // console.log(UserData, "userdataaa");
    // console.log("loginnn");
    res.render("admin/home", { layout: "adminlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
const loadUserManage = async (req, res) => {
  try {
    console.log(req.session.user_id);
    const userData = await User.find({ is_admin: 0 }).lean();
    res.render("admin/userlist", { layout: "adminlayout", user: userData });
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};
const editUser = async (req, res) => {
  try {
    const id = req.query.id;
    console.log(req.query, "asaaa");
    console.log(req.query.id, "dasaaa");
    const userData = await User.findById({ _id: id }).lean();
    if (userData) {
      res.render("admin/edit-user", { layout: "adminlayout", user: userData });
    } else {
      res.redirect("/admin/home");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updatingUser = async (req, res) => {
  try {
    const id = req.body.id;

    const userData = await User.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          is_verified: req.body.verify,
        },
      }
    );
    res.redirect("/admin/usermanage");
  } catch (error) {
    throw new Error(error.message);
  }
};
// router.get("/edit-product/:id", async (req, res) => {
//   let product = await productHelpers.getProductDetails(req.params.id);
//   res.render("admin/edit-product", { product });
// });
const deleteUser = async (req, res) => {
  try {
    const id = req.query.id;
    await User.deleteOne({ _id: id });
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(error.message);
  }
};
const blockUser = async (req, res) => {
  try {
    const id = req.query.id;
    console.log(id, "idddddddddd");
    await User.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_blocked: true,
        },
      }
    );
    res.redirect("/admin/user-manage");
  } catch (error) {
    throw new Error(error.message);
  }
};

const blockUserlist = async (req, res) => {
  try {
    // console.log(req.query.user_id);
    const userData = await User.find({ is_blocked: true }).lean();
    // console.log(userData);
    res.render("admin/block-userlist", {
      layout: "adminlayout",
      user: userData,
    });
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};

const unblockUserlist = async (req, res) => {
  try {
    const id = req.query.id;
    console.log(id, "idddddddddd");
    const userData = await User.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_blocked: false,
        },
      }
    );
    res.redirect("/admin/user-manage");
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};
const loadproduct = async (req, res) => {
  try {
    const updatedProducts = await Product.find().lean();

    // Create a lookup object for category names
    const categoryLookup = {};
    const categories = await Category.find().lean();

    categories.forEach((category) => {
      categoryLookup[category._id] = category.category;
    });

    const productWithSerialNumber = updatedProducts.map((product, index) => ({
      ...product,
      serialNumber: index + 1,
      category: categoryLookup[product.category],
    }));

    console.log("Retrieving categories...");
    console.log("Categories:", categories);
    console.log(updatedProducts, "updated");
    console.log(productWithSerialNumber, "product");
    res.render("admin/product-manage", {
      layout: "adminlayout",
      products: updatedProducts,
      categories: categories,
    });
    // console.log(products, "popo");
  } catch (error) {
    console.log(error.message);
  }
};

const addproduct = async (req, res) => {
  try {
    var arrayImage = [];
    if (req.files && req.files.length) {
      for (let i = 0; i < req.files.length; i++) {
        arrayImage[i] = req.files[i].filename;
      }
    }

    console.log("hellooo", req.body);
    const product = new Product({
      productname: req.body.productname,
      category: req.body.category,
      description: req.body.description,
      price: req.body.price,
      //image: req.file.filename,
      image: arrayImage,
      // size: req.body.size,
      stock: req.body.stock,
    });
    console.log(product, "productz");
    const addProduct = await product.save();
    console.log(addProduct, "addproductzz");
    if (addProduct) {
      const updatedProducts = await Product.find().lean();

      // Create a lookup object for category names
      const categoryLookup = {};
      const categories = await Category.find().lean();
      categories.forEach((category) => {
        categoryLookup[category._id] = category.category;
        console.log(category);
      });
      console.log(categories, "categoriessss");
      const productWithSerialNumber = updatedProducts.map((product, index) => ({
        ...product,
        serialNumber: index + 1,
        category: categoryLookup[product.category] || "Unknown Category",
      }));
      // console.log("prooo", productWithSerialNumber);

      res.render("admin/product-manage", {
        layout: "adminlayout",
        products: productWithSerialNumber,
        categories: categories,
      });
    }
    // console.log("prooo", productWithSerialNumber);
  } catch (error) {
    console.log(error.message);
  }
};

const editProductsView = async (req, res) => {
  try {
    const id = req.query.id;

    const categories = await Category.find({ is_activate: true }).lean();
    console.log(categories);
    const categoryData = {};
    categories.forEach((data) => {
      categoryData[data._id.toString()] = {
        _id: data._id.toString(),
        category: data.category,
      };
    });

    const categoryLookup = {};
    categories.forEach((category) => {
      categoryLookup[category._id.toString()] = category.category;
    });

    // Define the lookupCategory helper function
    const lookupCategory = function (categoryId) {
      return categoryLookup[categoryId] || "Unknown";
    };

    const updatedProduct = await Product.findById(id).lean();

    console.log(updatedProduct, "updatedproducts");
    if (updatedProduct) {
      const productWithCategoryName = {
        ...updatedProduct,
        category: lookupCategory(updatedProduct.category),
      };
      console.log("products:", productWithCategoryName);
      console.log("categories", categoryData);
      res.render("admin/edit-product", {
        layout: "adminlayout",
        product: updatedProduct,
        categories: categoryData,
      });
    } else {
      console.log("Product not found");
      res.redirect("/admin/product");
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
const editProducts = async (req, res) => {
  try {
    console.log(req.files, "hi");
    const id = req.query.id;
    console.log(id, "----------------");
    const product = await Product.findById({
      _id: new mongoose.Types.ObjectId(req.query.id),
    }).lean();
    console.log(product, "product");
    console.log(req.body.category, "coming to updating");

    const categoryId = req.body.category;

    let updatedProductData = {
      productname: req.body.productname,
      price: req.body.price,
      description: req.body.description,
      category: new mongoose.Types.ObjectId(categoryId),
      image: product.image, // Use the previous image data as the starting point
    };
    console.log(updatedProductData, "updatedProductData");
    if (req.files && req.files.length > 0) {
      updatedProductData.image = req.files.map((file) => file.filename); // Update with the new image filenames
    }

    const product1 = await Product.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.query.id) },
      { $set: updatedProductData }
    );
    console.log(product1, "product1");
    res.redirect("/admin/product");
  } catch (error) {
    throw new Error(error.message);
  }
};
// updatingProducts: async (req, res) => {
//   try {
//     console.log(req.files, 'hi');
//     const id = req.query.id;
//     console.log(id, '----------------');
//     const product = await Product.findById({ _id: new mongoose.Types.ObjectId(req.query.id) }).lean();
//     console.log(product, 'product');
//     console.log(req.body.category, "coming to updating");

//     const categoryId = req.body.category;

//     let updatedProductData = {
//       name: req.body.name,
//       price: req.body.price,
//       description: req.body.description,
//       category: new mongoose.Types.ObjectId(categoryId),
//       image: product.image, // Use the previous image data as the starting point
//     };
//     console.log(updatedProductData, 'updatedProductData');
//     if (req.files && req.files.length > 0) {
//       updatedProductData.image = req.files.map((file) => file.filename); // Update with the new image filenames
//     }

//     const product1 = await Product.findByIdAndUpdate({ _id: new mongoose.Types.ObjectId(req.query.id) }, { $set: updatedProductData });
//     console.log(product1, 'product1');
//     res.redirect('/admin/products');
//   } catch (error) {
//     throw new Error(error.message);
//   }
// },

const addcategory = async (req, res) => {
  try {
    const category = new Category({
      category: req.body.category,
      image: req.file.filename,
      is_activate: true,
    });

    console.log(category);
    // const categoryWithSerialNumber = updatedProducts.map((product, index) => ({
    //   ...category,
    //   serialNumber: index + 1,
    // }));

    const categoryData = await category.save();
    if (categoryData) {
      // console.log(categoryData);

      res.render("admin/category-manage", {
        message: "Category Created  successfully",
        layout: "adminLayout",
      });
    } else {
      res.render("/admin/category-manage", {
        message: "your registration has ben Failed",
        layout: "adminLayout",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const product_activate = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_activate: true,
        },
      }
    );
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};
const product_inactivate = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_activate: false,
        },
      }
    );
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};
const getcategory = async (req, res) => {
  try {
    const categoryData = await Category.find().lean();
    console.log(categoryData, "categgoorryy");
    if (categoryData) {
      res.render("admin/category-manage", {
        layout: "adminlayout",
        category: categoryData,
      });
    } else {
      res.redirect("/admin/category-manage");
    }
  } catch (error) {
    console.log(error.message);
  }
};
const category_activate = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_activate: true,
        },
      }
    );
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};
const category_inactivate = async (req, res) => {
  console.log("clicked");
  try {
    const id = req.query.id;
    console.log("id", id);
    await Category.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          is_activate: false,
        },
      }
    );
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error.message);
    res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
  }
};

const loadOrdersList = async (req, res) => {
  try {
    console.log("clickedd----------");
    const orderDetails = await Order.find().populate("userId").lean();
    console.log(orderDetails, "orderDetails");

    const orderHistory = orderDetails.map((history) => {
      let createdOnIST = moment(history.date)
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY h:mm A");

      return { ...history, date: createdOnIST, userName: history.userId.name };
    });
    console.log(orderHistory, "orderHistory-----");
    res.render("admin/orderList", {
      layout: "adminlayout",
      orderDetails: orderHistory,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const loadOrdersViews = async (req, res) => {
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
        name: product.productId.name,
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

      orderId: orderId,
      orderDate: createdOnIST,
      cancellationStatus: cancellationStatus,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const cancelledOrderByAdmin = async (requestData) => {
  try {
    const orderId = requestData;
    console.log(orderId, "orderidddddddddddddd");
    await Order.findByIdAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { orderStatus: "cancelled", cancellationStatus: "cancelled" } },
      { new: true } // This ensures that the updated document is returned
    ).exec();

    console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

    return updateOrder;
  } catch (error) {
    throw new Error(error.message);
  }
};

const rejectCancellation = async (requestData) => {
  try {
    const orderId = requestData;
    console.log(orderId, "orderidddddddddddddd");
    await Order.findByIdAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { orderStatus: "Placed", cancellationStatus: "Not requested" } },
      { new: true } // This ensures that the updated document is returned
    ).exec();

    console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

    return updateOrder;
  } catch (error) {
    throw new Error(error.message);
  }
};

const packingOrder = async (requestData) => {
  try {
    const orderId = requestData;
    console.log(orderId, "orderidddddddddddddd");
    await Order.findByIdAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          orderStatus: "Packing order",
          cancellationStatus: "Packing order",
        },
      },
      { new: true } // This ensures that the updated document is returned
    ).exec();

    console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

    return updateOrder;
  } catch (error) {
    throw new Error(error.message);
  }
};

const deliveredOrder = async (requestData) => {
  try {
    const orderId = requestData;
    console.log(orderId, "orderidddddddddddddd");
    await Order.findByIdAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { orderStatus: "Delivered", cancellationStatus: "Delivered" } },
      { new: true } // This ensures that the updated document is returned
    ).exec();

    console.log(updateOrder, "updateOrderrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

    return updateOrder;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  loadUserManage,
  editUser,
  updatingUser,
  blockUser,
  blockUserlist,
  unblockUserlist,
  loadproduct,
  addproduct,
  editProductsView,
  editProducts,
  product_activate,
  product_inactivate,
  addcategory,
  getcategory,
  category_activate,
  category_inactivate,
  loadOrdersList,
  loadOrdersViews,
  cancelledOrderByAdmin,
  rejectCancellation,
  packingOrder,
  deliveredOrder,
};
