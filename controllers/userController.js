const User = require("../models/userModel");
const bcryptjs = require("bcrypt");
const config = require("../config/config");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const Cart = require("../models/cartModel");
const Address = require("../models/userAddressModel");
const Order = require("../models/orderModel");
const userHelpers = require("../helpers/userHelper");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_geVs1Kqnz5ziUc",
  key_secret: "CpMAeOoo1SEci1tr6OXJm7pe",
});

//for send mail
const sendVerifyMail = async (name, email, user_id) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
    const mailOptions = {
      from: "priyareji25@gmail.com",
      to: email,
      subject: "For Verification mail",
      html:
        "<p> Hii " +
        name +
        ',please click here to <a href="http://127.0.01:3000/verify?id=' +
        user_id +
        '">Verify</a>',
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};
//for verifying mail
const verifyMail = async (req, res) => {
  try {
    const id = req.query.id;
    const updateInfo = await User.updateOne(
      { _id: id },
      { $set: { is_verified: 1 } }
    );
    console.log(updateInfo);
    res.render("users/email-verified", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
// Secure Password
const securePassword = async (password) => {
  try {
    const PasswordHash = await bcryptjs.hash(password, 10);
    return PasswordHash;
  } catch (error) {
    res.status(400).send(error.message);
  }
};
// Registration
const insertUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
      is_blocked: false,
    });

    console.log(user);

    const userData = await user.save();
    if (userData) {
      console.log(userData);
      sendVerifyMail(req.body.name, req.body.email, userData._id);
      res.render("users/registration", {
        message:
          "your registration has ben successfully.Please Verify your mail id",
        layout: "userLayout",
      });
    } else {
      res.render("users/registration", {
        message: "your registration has ben Failed",
        layout: "userLayout",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
// loading registration page
const loadRegister = async (req, res) => {
  try {
    res.render("users/registration", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
//loading login page

const loadLogin = async (req, res) => {
  try {
    res.render("users/login", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
// login verification

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });
    console.log(userData);
    if (userData) {
      const passwordMatch = await bcryptjs.compare(password, userData.password);
      if (passwordMatch) {
        console.log(passwordMatch);
        if (userData.is_verified === 0) {
          res.render("users/login", {
            message: "Please verify your email",
            layout: "userlayout",
          });
          if (userData.is_blocked === true) {
            res.render("users/login", {
              message: "You are blocked",
              layout: "userlayout",
            });
          }
        } else {
          req.session.user_id = userData._id;

          res.redirect("/home");
        }
      } else {
        res.render("users/login", {
          message: "Email and password are invalid",
          layout: "userlayout",
        });
      }
    } else {
      res.render("users/login", {
        message: "Email and password are invalid",
        layout: "userlayout",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

//forget password

// after verify to rseting password in mail goes through this page
const forgetPasswordLoad = async (req, res) => {
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({ token: token });
    if (tokenData) {
      res.render("users/forget-password", {
        layout: "userlayout",
        user_id: tokenData._id,
      });
    } else {
      res.render("error", {
        layout: "userlayout",
        message: "Token is invalid.",
      });
    }
    console.log("reseting started");
  } catch (error) {
    console.log(err.message);
  }
};

// reseting the password

const resetPassword = async (req, res) => {
  try {
    const password = req.body.password;
    const user_id = req.body.user_id;
    const sec_password = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate(
      user_id,
      {
        $set: { password: sec_password, token: "" },
      },
      { new: true }
    );
    console.log("reseetting done");
    res.redirect("/login");
  } catch (error) {
    console.log(error.message);
  }
};

///resetlink
const sendResetLink = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email: email });
    if (userData) {
      if (userData.is_verified === 0) {
        res.render("users/forget", {
          layout: "userlayout",
          message: "Please verify your email",
        });
      } else {
        const randomString = randomstring.generate();
        const updatedData = await User.updateOne(
          { email: email },
          { $set: { token: randomString } }
        );
        sendResetpasswordmail(userData.name, userData.email, randomString);
        res.render("users/forget", {
          layout: "userlayout",
          message: "Please check your email for password reset instructions",
        });
      }
    } else {
      res.render("users/forget", {
        layout: "userlayout",
        message: "Email is incorrect",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.render("error", { error });
  }
};

//load forget password page
const forgetLoad = async (req, res) => {
  try {
    res.render("users/forget", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};

const loadOTP = async (req, res) => {
  try {
    res.render("users/otp", { layout: "user-layout" });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendOTP = async (req, res) => {
  try {
    console.log(req.body.mobile);
    let mobile = req.body.mobile;

    console.log(mobile);

    req.session.userMobileForOtp = req.body.mobile;
    const userData = await User.findOne({ mobile: mobile });
    console.log(userData);
    if (userData) {
      if (userData.is_verified === true) {
        const userMobile = "+91" + mobile;
        twilio.verify.v2
          .services(verifySid)
          .verifications.create({ to: userMobile, channel: "sms" })
          .then((verification) => {
            if (verification.status === "pending") {
              res.render("users/verify-otp", { layout: "user-layout" });
            } else {
              res.render("users/otp", {
                message: "OTP sending failed",
                layout: "user-layout",
              });
            }
          });
      } else {
        res.render("users/otp", {
          message: "You have to verify email before OTP login",
          layout: "user-layout",
        });
      }
    } else {
      res.render("users/otp", {
        message: "You have to signup before OTP login",
        layout: "user-layout",
      });
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

const loadVerifyOTP = async (req, res) => {
  try {
    res.render("users/verify-otp", { layout: "user-layout" });
  } catch (error) {
    throw new Error(error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const userMobile = "+91" + req.session.userMobileForOtp;
    console.log(userMobile);
    const otp = req.body.otp;
    twilio.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: userMobile, code: otp })
      .then(async (verification_check) => {
        if (verification_check.status === "approved") {
          console.log(verification_check.status);
          let user = await User.findOne({
            mobile: req.session.userMobileForOtp,
          });

          req.session.user_id = user._id;

          console.log(req.session.user_id);

          res.redirect("/home");
        } else {
          res.render("users/verify-otp", {
            message: "invalid OTP",
            layout: "user-layout",
          });
        }
      });
  } catch (error) {
    throw new Error(error.message);
  }
};

//load home
const loadHome = async (req, res) => {
  try {
    const productData = await Product.find({ is_activate: true }).lean();
    const categoryData = await Category.find({ is_activate: true }).lean();
    const check = await Cart.findOne({ user_id: req.session.user_id });
    let sumOfQuantities = 0;
    if (check) {
      const cart = await Cart.findOne({ user_id: req.session.user_id }).lean();
      for (const product of cart.products) {
        sumOfQuantities += product.quantity;
      }
    }
    console.log("Sum of quantities:++++++++++++++++++++", sumOfQuantities);
    res.render("users/home", {
      layout: "userlayout",
      products: productData,
      category: categoryData,
      sumOfQuantities,
    });
  } catch (error) {
    console.log(error);
  }
};
//logout
const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    throw new Error(error.message);
  }
};
const sendResetpasswordmail = async (name, email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
    const mailOption = {
      from: config.emailUser,
      to: email,
      subject: "to Reset Password",
      html:
        "<p> hi" +
        name +
        ',please click here to <a href="http://localhost:3000/forget-password?token=' +
        token +
        '">reset </a>your password</p>',
    };
    transporter.sendMail(mailOption, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("email has been sent:-", info.response);
      }
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const viewSinglepage = async (req, res) => {
  try {
    const id = req.query.id;
    const productData = await Product.findById(id).lean();
    const products = await Product.find({ is_activate: true }).lean();
    const check = await Cart.findOne({ user_id: req.session.user_id });
    let sumOfQuantities = 0;
    if (check) {
      const cart = await Cart.findOne({ user_id: req.session.user_id }).lean();
      for (const product of cart.products) {
        sumOfQuantities += product.quantity;
      }
    }
    console.log("Sum of quantities:++++++++++++++++++++", sumOfQuantities);
    // const categoryData = await Category.find({ is_activate: true }).lean();
    console.log("products", productData);
    if (productData) {
      res.render("users/single-product", {
        layout: "userlayout",
        product: productData,
        products: products,
        sumOfQuantities,

        // category: categoryData,
      });
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

//load Product
// const productlist = async (req, res) => {
//   try {
//     // console.log(req.query.user_id);
//     const userData = await User.find({ is_activate: true }).lean();
//     // console.log(userData);
//     res.render("admin/block-userlist", {
//       layout: "adminlayout",
//       user: userData,
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
//   }
// };
const addToCart = async (req, res) => {
  try {
    console.log("cart loading");
    const proId = req.body.productId;
    console.log(proId, "id is coming");

    let cart = await Cart.findOne({ user_id: req.session.user_id });

    if (!cart) {
      let newCart = new Cart({ user_id: req.session.user_id, products: [] });
      await newCart.save();
      cart = newCart;
    }

    const existingProductIndex = cart.products.findIndex((product) => {
      return product.productId.toString() === proId;
    });

    if (existingProductIndex === -1) {
      const product = await Product.findById(proId).lean();
      const total = product.price; // Set the initial total to the price of the product
      cart.products.push({
        productId: proId,
        quantity: 1,
        total, // Use the updated total value
      });
    } else {
      cart.products[existingProductIndex].quantity += 1;
      const product = await Product.findById(proId).lean();
      cart.products[existingProductIndex].total += product.price; // Update the total by adding the price of the product
    }

    // Calculate the updated total amount for the cart
    cart.total = cart.products.reduce((total, product) => {
      return total + product.total;
    }, 0);

    await cart.save();
    console.log(cart);

    // Send a response indicating success or any other relevant data
    res.status(200).json({ message: "Product added to cart successfully" });
  } catch (error) {
    // Handle any errors that occurred during the process
    res.status(500).json({ error: error.message });
  }
};

const viewaddToCart = async (req, res) => {
  try {
    // console.log("entered loading cart page");
    // console.log("useridd", req.session.user_id);
    //const User_id =
    const check = await Cart.findOne({ user_id: req.session.user_id });
    // console.log("------------");
    // console.log("checking no 1", check, "this is cart");
    if (check) {
      const cart = await Cart.findOne({ user_id: req.session.user_id })
        .populate({
          path: "products.productId",
        })
        .lean()
        .exec();
      console.log(cart, "checking no 2");
      console.log("products", cart.products);
      let sumOfQuantities = 0;
      for (const product of cart.products) {
        sumOfQuantities += product.quantity;
      }
      console.log("Sum of quantities:++++++++++++++++++++", sumOfQuantities);
      const products = cart.products.map((product) => {
        const total =
          Number(product.quantity) * Number(product.productId.price);
        return {
          _id: product.productId._id.toString(),
          productname: product.productId.productname,
          image: product.productId.image,
          price: product.productId.price,
          description: product.productId.description,
          quantity: product.quantity,
          total,
          user_id: req.session.user_id,
        };
      });
      // console.log("products data is :", products);

      const total = products.reduce(
        (sum, product) => sum + Number(product.total),
        0
      );
      console.log(total);

      const finalAmount = total;

      // Get the total count of products
      const totalCount = products.length;
      console.log(totalCount);
      res.render("users/add-to-cart", {
        layout: "userlayout",
        products,
        total,
        totalCount,
        subtotal: total,
        finalAmount,
        sumOfQuantities,
      });
    } else {
      res.render("users/add-to-cart", {
        message: "Your cart is empty",
        layout: "userlayout",
      });
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
const changeProductQuantity = async (req, res) => {
  try {
    console.log(req.body.userId, "userid is this");
    console.log(req.body.productId, "product id is this");
    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const productId = new mongoose.Types.ObjectId(req.body.productId);
    const quantity = req.body.quantity;
    const cartFind = await Cart.findOne({ user_id: userId });
    const cartId = cartFind._id;
    const count = req.body.count;
    console.log(userId, "userId");
    console.log(productId, "productid");
    console.log(quantity, "quantity");
    console.log(cartId, "cartId");
    console.log(count, "count");

    // Find the cart for the given user and product
    const cart = await Cart.findOneAndUpdate(
      { user_id: userId, "products.productId": productId },
      { $inc: { "products.$.quantity": count } },
      { new: true }
    ).populate("products.productId");

    // Update the total for the specific product in the cart
    const updatedProduct = cart.products.find((product) =>
      product.productId._id.equals(productId)
    );
    updatedProduct.total =
      updatedProduct.productId.price * updatedProduct.quantity;
    await cart.save();

    //   Check if the quantity is 0 or less
    if (updatedProduct.quantity <= 0) {
      // Remove the product from the cart
      cart.products = cart.products.filter(
        (product) => !product.productId._id.equals(productId)
      );
      await cart.save();
      const response = { deleteProduct: true };
      res.send(response);
      return response;
    }

    // Calculate the new subtotal for all products in the cart
    const subtotal = cart.products.reduce((acc, product) => {
      return acc + product.total;
    }, 0);

    const total = updatedProduct.total;
    console.log(total);
    // Prepare the response object
    const response = {
      quantity: updatedProduct.quantity,
      subtotal: subtotal,
      productTotal: total,
    };
    console.log(response, "resposeeeeee");
    res.send(response);
    return response;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
const viewuserProfile = async (req, res) => {
  try {
    console.log(req.session.user_id);
    const userId = req.session.user_id;
    const userData = await User.findById(userId).lean();
    console.log(userData, "UserData");
    const defaultAddress = await Address.findOne(
      { user_id: userId, "address.isDefault": true },
      { "address.$": 1 }
    ).lean();
    console.log(defaultAddress, "defaultAddress");

    res.render("users/user-profile", {
      layout: "userlayout",
      user: userData,
      defaultAddress: defaultAddress.address[0],
    });
  } catch (error) {
    console.log(error.message);
  }
};

// const editUser = async (req, res) => {
//   try {
//     const id = req.body.id;

//     const userData = await User.findByIdAndUpdate(
//       { _id: id },
//       {
//         $set: {
//           name: req.body.name,
//           email: req.body.email,
//           mobile: req.body.mobile,
//           is_verified: req.body.verify,
//         },
//       }
//     );
//     res.redirect("/user-profile");
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };
const editUser = async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.session.user_id);
    const userData = await User.findById({ _id: id }).lean();
    console.log("clicked");
    if (!userData) {
      throw new Error("User data not found");
    }

    let updatedUserData = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    };
    await User.findByIdAndUpdate(
      { _id: id },
      { $set: updatedUserData },
      { new: true }
    );
    res.redirect("/user-profile");
  } catch (error) {
    throw new Error(error.message);
  }
};
const loadAddressList = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const userAddress = await Address.findOne({ user_id: userId })
      .lean()
      .exec();

    if (userAddress) {
      // Check if there is only one address in the array
      if (userAddress.address.length === 1) {
        // If there is only one address, set it as the default
        userAddress.address[0].isDefault = true;
      }

      const addressDetails = userAddress.address.map((address) => {
        return {
          name: address.name,
          mobile: address.mobile,
          homeAddress: address.homeAddress,
          city: address.city,
          street: address.street,
          postalCode: address.postalCode,
          _id: address._id,
          isDefault: address.isDefault,
        };
      });

      console.log(addressDetails, "addressdetails");
      res.render("users/address", { layout: "userlayout", addressDetails });
    } else {
      res.render("users/address", { layout: "userlayout", addressDetails: [] });
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

const addingAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { name, mobile, homeAddress, city, street, postalCode } = req.body;
    console.log(name);
    console.log(mobile);

    console.log(city);
    console.log(street);
    console.log(postalCode);
    const newAddress = {
      name: name,
      mobile: mobile,
      homeAddress: homeAddress,
      city: city,
      street: street,
      postalCode: postalCode,
      isDefault: false, // Set the default flag to false by default
    };

    // Find the user's address document based on the user_id
    let userAddress = await Address.findOne({ user_id: userId });

    if (!userAddress) {
      // If the user doesn't have any address, create a new document
      newAddress.isDefault = true;
      userAddress = new Address({ user_id: userId, address: [newAddress] });
    } else {
      // If the user already has an address, push the new address to the array
      userAddress.address.push(newAddress);
      // Check if there is only one address in the array
      if (userAddress.address.length === 1) {
        // If there is only one address, set it as the default
        userAddress.address[0].isDefault = true;
      }
    }

    await userAddress.save(); // Save the updated address document
    console.log(userAddress, "useraddress");

    res.redirect("/address");
  } catch (error) {
    throw new Error(error.message);
  }
};

const addingNewAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { name, mobile, homeAddress, city, street, postalCode } = req.body;
    console.log(name);
    console.log(mobile);

    console.log(city);
    console.log(street);
    console.log(postalCode);
    const newAddress = {
      name: name,
      mobile: mobile,
      homeAddress: homeAddress,
      city: city,
      street: street,
      postalCode: postalCode,
      isDefault: false, // Set the default flag to false by default
    };

    // Find the user's address document based on the user_id
    let userAddress = await Address.findOne({ user_id: userId });

    if (!userAddress) {
      // If the user doesn't have any address, create a new document
      newAddress.isDefault = true;
      userAddress = new Address({ user_id: userId, address: [newAddress] });
    } else {
      // If the user already has an address, push the new address to the array
      userAddress.address.push(newAddress);
      // Check if there is only one address in the array
      if (userAddress.address.length === 1) {
        // If there is only one address, set it as the default
        userAddress.address[0].isDefault = true;
      }
    }

    await userAddress.save(); // Save the updated address document
    console.log(userAddress, "useraddress");

    res.redirect("/checkout");
  } catch (error) {
    throw new Error(error.message);
  }
};

const deletingAddress = async (req, res) => {
  try {
    const id = req.query.id;
    const userId = req.session.user_id;

    // Find the address with the specified address ID
    const address = await Address.findOne({ user_id: userId });

    // Find the deleted address and check if it is the default address
    const deletedAddress = address.address.find(
      (addr) => addr._id.toString() === id
    );
    console.log(deletedAddress, "deletedAddress");
    const isDefaultAddress = deletedAddress && deletedAddress.isDefault;
    console.log(isDefaultAddress, "isDefaultAddress");

    // Remove the address with the specified ID from the address array
    address.address = address.address.filter(
      (addr) => addr._id.toString() !== id
    );

    // If the deleted address was the default address, set the next available address as the new default
    if (isDefaultAddress && address.address.length > 0) {
      // Find the first non-deleted address and set it as the new default
      const newDefaultAddress = address.address.find(
        (addr) => addr._id.toString() !== id
      );
      if (newDefaultAddress) {
        newDefaultAddress.isDefault = true;
      }
      console.log(newDefaultAddress, "newDefaultAddress");
    }

    // Save the updated address
    await address.save();
    res.redirect("/address");
  } catch (error) {
    throw new Error(error.message);
  }
};

const editingAddress = async (req, res) => {
  try {
    console.log("called");
    const userId = req.session.user_id;
    console.log(userId, "////////////////////////////////////////////////////");
    console.log(req.body, "================");
    const { name, mobile, homeAddress, city, street, postalCode } = req.body;

    const id = req.body._id;
    console.log(id, "iddddddddddd");
    console.log(name, "name");
    console.log(mobile, "mobile");
    console.log(homeAddress, "homeAddress");
    console.log(city, "city");
    console.log(street, "street");
    console.log(postalCode, "postalCode");

    await Address.findOneAndUpdate(
      { user_id: userId, "address._id": id },
      {
        $set: {
          "address.$.name": name,
          "address.$.mobile": mobile,
          "address.$.homeAddress": homeAddress,
          "address.$.city": city,
          "address.$.street": street,
          "address.$.postalCode": postalCode,
        },
      },
      { new: true }
    );

    if (updatedAddress) {
      console.log("Address updated successfully:", updatedAddress);
      // Redirect or send a response indicating the update was successful
      res.redirect("/address");
    } else {
      console.log("Address not found or not updated");
      // Redirect or send a response indicating the address was not found or not updated
      res.redirect("/address");
    }
  } catch (error) {
    console.error("Error updating address:", error);
    // Handle the error appropriately
    res.redirect("/address");
  }
};

const settingAsDefault = async (req, res) => {
  try {
    console.log("clickedddddddddddd");
    const addressId = req.body.addressId;
    const userId = req.session.user_id;
    console.log("adressid///////", addressId);
    console.log("userId//////////", userId);
    // Find the current default address and unset its "isDefault" flag
    await Address.findOneAndUpdate(
      { user_id: userId, "address.isDefault": true },
      { $set: { "address.$.isDefault": false } }
    );

    // Set the selected address as the new default address
    await Address.findOneAndUpdate(
      { user_id: userId, "address._id": addressId },
      { $set: { "address.$.isDefault": true } }
    );

    const response = {
      setDefault: true,
    };

    return response;
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to set address as default" });
  }
};

const loadingCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log(userId, "id");

    // Find the default address for the user
    const defaultAddress = await Address.findOne(
      { user_id: userId, "address.isDefault": true },
      { "address.$": 1 }
    ).lean();

    console.log(defaultAddress, "default address");

    // Find the user document and extract the address array
    const userDocument = await Address.findOne({ user_id: userId }).lean();
    const addressArray = userDocument.address;
    console.log(addressArray, "addressArray");

    // Filter the addresses where isDefault is false
    const filteredAddresses = addressArray.filter(
      (address) => !address.isDefault
    );
    console.log(filteredAddresses, "filteredAddresses");

    // finding cart products //

    const cart = await Cart.findOne({ user_id: req.session.user_id })
      .populate({
        path: "products.productId",
        populate: { path: "category", select: "category" },
      })
      .lean()
      .exec();

    const products = cart.products.map((product) => {
      const total = Number(product.quantity) * Number(product.productId.price);
      return {
        _id: product.productId._id.toString(),
        productname: product.productId.productname,
        category: product.productId.category.category, // Access the category field directly
        image: product.productId.image,
        price: product.productId.price,
        description: product.productId.description,
        quantity: product.quantity,
        total,
        user_id: req.session.user_id,
      };
    });

    const total = products.reduce(
      (sum, product) => sum + Number(product.total),
      0
    );
    const finalAmount = total;
    // Get the total count of products
    const totalCount = products.length;

    res.render("users/checkout", {
      layout: "userlayout",
      defaultAddress: defaultAddress ? defaultAddress.address[0] : null, // Add a conditional check for defaultAddress
      filteredAddresses,
      products,
      total,
      totalCount,
      subtotal: total,
      finalAmount,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const changingTheAddress = async (req, res) => {
  const addressId = req.body.addressId;
  const userId = req.session.user_id;
  try {
    // Find the current default address and unset its "isDefault" flag
    await Address.findOneAndUpdate(
      { user_id: userId, "address.isDefault": true },
      { $set: { "address.$.isDefault": false } }
    );

    // Set the selected address as the new default address
    await Address.findOneAndUpdate(
      { user_id: userId, "address._id": addressId },
      { $set: { "address.$.isDefault": true } }
    );

    res.redirect("/checkout");
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to set address as default" });
  }
};

// const placeOrders = async (req, res) => {
//   try {
//     console.log("entered");
//     const paymentMethod = req.body.paymentMethod;
//     console.log(paymentMethod, "paymentMethod");

//     const userId = req.session.user_id;
//     console.log(userId, "id");

//     const orderStatus = paymentMethod === "COD" ? "Placed" : "Pending";
//     console.log(orderStatus, "orderStatus");

//     // Find the default address for the user
//     const defaultAddress = await Address.findOne(
//       { user_id: userId, "address.isDefault": true },
//       { "address.$": 1 }
//     ).lean();
//     console.log(defaultAddress, "default address");

//     if (!defaultAddress) {
//       console.log("Default address not found");
//       return res.redirect("/address");
//     }

//     const productDetails = await Cart.findOne({ user_id: userId }).lean();
//     console.log(productDetails, "productDetails");

//     // Calculate the new subtotal for all products in the cart
//     const subtotal = productDetails.products.reduce((acc, product) => {
//       return acc + product.total;
//     }, 0);

//     console.log(subtotal, "subtotal");

//     const products = productDetails.products.map((product) => ({
//       productId: product.productId,
//       quantity: product.quantity,
//       total: product.total,
//     }));
//     const defaultAddressDetails = defaultAddress.address[0];
//     const address = {
//       name: defaultAddressDetails.name,
//       mobile: defaultAddressDetails.mobile,
//       homeAddress: defaultAddressDetails.homeAddress,
//       city: defaultAddressDetails.city,
//       street: defaultAddressDetails.street,
//       postalCode: defaultAddressDetails.postalCode,
//     };
//     console.log(address, "address");

//     const orderDetails = new Order({
//       userId: userId,
//       date: Date(),
//       orderValue: subtotal,
//       paymentMethod: paymentMethod,
//       orderStatus: orderStatus,
//       products: products,
//       addressDetails: address,
//     });

//     const placedOrder = await orderDetails.save();

//     console.log(placedOrder, "placedOrder");

//     // Remove the products from the cart
//     await Cart.deleteMany({ user_id: userId });

//     res.render("users/order-placed", { layout: "userlayout", placedOrder });
//   } catch (error) {
//     console.error(error);
//     res.redirect("/address");
//   }
// };
const placeOrder = async (req, res) => {
  try {
    console.log("enter---------");
    let userId = req.session.user_id; // Used for storing user details for further use in this route
    let orderDetails = req.body;
    console.log(orderDetails, "orderdetailsssssssssssssssssssssssssss");

    // console.log(req.body,'vvvvvvvvvvvvvvvvvvvvvvvv');
    console.log(userId, "useriddddddddddddddddddddddd");
    let orderedProducts = await userHelpers.getProductListForOrders(userId);
    // console.log(orderedProducts,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    if (orderedProducts) {
      let totalOrderValue = await userHelpers.getCartValue(userId);

      userHelpers
        .placingOrder(userId, orderDetails, orderedProducts, totalOrderValue)
        .then((orderId) => {
          if (req.body["paymentMethod"] === "COD") {
            res.json({ COD_CHECKOUT: true });
          } else if (req.body["paymentMethod"] === "ONLINE") {
            userHelpers
              .generateRazorpayOrder(orderId, totalOrderValue)
              .then(async (razorpayOrderDetails) => {
                const user = await User.findById({ _id: userId }).lean();
                res.json({
                  ONLINE_CHECKOUT: true,
                  userDetails: user,
                  userOrderRequestData: orderDetails,
                  orderDetails: razorpayOrderDetails,
                  razorpayKeyId: "rzp_test_geVs1Kqnz5ziUc",
                });
              });
          } else {
            res.json({ paymentStatus: false });
          }
        });
    } else {
      res.json({ checkoutStatus: false });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const orderPlaced = async (req, res) => {
  try {
    res.render("users/orderPlaced", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};
const orderFailed = async (req, res) => {
  try {
    res.render("users/orderFailed", { layout: "userlayout" });
  } catch (error) {
    console.log(error.message);
  }
};

const orderDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const orderDetails = await Order.find({ userId: userId }).lean();
    orderHistory = orderDetails.map((history) => {
      let createdOnIST = moment(history.date)
        .tz("Asia/kolkata")
        .format("DD-MM-YYYY h:mm A");

      return { ...history, date: createdOnIST };
    });

    console.log(orderDetails, "orderDetails");

    res.render("users/ordersList", {
      layout: "userlayout",
      orderDetails: orderHistory,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const loadOrdersView = async (req, res) => {
  try {
    const orderId = req.query.id;

    const userId = req.session.user_id;

    console.log(orderId, "orderId when loading page");
    const order = await Order.findOne({ _id: orderId }).populate({
      path: "products.productId",
      select: "name price image",
    });
    // console.log(products.productId, "product");

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

    const subtotal = order.orderValue;
    const cancellationStatus = order.cancellationStatus;
    console.log(cancellationStatus, "cancellationStatus");

    console.log(subtotal, "subtotal");

    console.log(orderDetails, "orderDetails");
    console.log(deliveryAddress, "deliveryAddress");

    res.render("users/ordersView", {
      layout: "userlayout",
      orderDetails: orderDetails,
      deliveryAddress: deliveryAddress,
      subtotal: subtotal,

      orderId: orderId,
      orderDate: createdOnIST,
      cancellationStatus: cancellationStatus,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const cancellOrder = async (requestData) => {
  try {
    const orderId = requestData;

    const updateOrder = await Order.findByIdAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { cancellationStatus: "cancellation requested" } }
    );

    return updateOrder;
  } catch (error) {
    throw new Error(error.message);
  }
};

const verifyPayment = async (req, res) => {
  userHelpers
    .verifyOnlinePayment(req.body)
    .then(() => {
      let receiptId = req.body["serverOrderDetails[receipt]"];

      let paymentSuccess = true;
      userHelpers
        .updateOnlineOrderPaymentStatus(receiptId, paymentSuccess)
        .then(() => {
          // Sending the receiptId to the above userHelper to modify the order status in the DB
          // We have set the Receipt Id is same as the orders cart collection ID

          res.json({ status: true });
        });
    })
    .catch((err) => {
      if (err) {
        console.log(err);

        let paymentSuccess = false;
        userHelpers
          .updateOnlineOrderPaymentStatus(receiptId, paymentSuccess)
          .then(() => {
            // Sending the receiptId to the above userHelper to modify the order status in the DB
            // We have set the Receipt Id is same as the orders cart collection ID

            res.json({ status: false });
          });
      }
    });
};

module.exports = {
  loadRegister,
  insertUser,
  verifyMail,
  loadLogin,
  verifyLogin,
  loadHome,
  userLogout,
  forgetLoad,
  sendResetLink,
  forgetPasswordLoad,
  resetPassword,
  sendResetpasswordmail,
  viewSinglepage,
  addToCart,
  viewaddToCart,
  changeProductQuantity,
  viewuserProfile,
  editUser,
  addingAddress,
  loadAddressList,
  addingNewAddress,
  deletingAddress,
  settingAsDefault,
  loadingCheckoutPage,
  changingTheAddress,
  editingAddress,
  placeOrder,
  orderDetails,
  loadOrdersView,
  cancellOrder,
  verifyPayment,
  orderPlaced,
  orderFailed,
};
