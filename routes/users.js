var express = require("express");
var router = express.Router();
const session = require("express-session");
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
const config = require("../config/config");
router.use(session({ secret: config.sessionSecret }));
const auth = require("../middleware/auth");
const userController = require("../controllers/userController");
/* GET users listing. */
// router.get("/", function (req, res, next) {
//   res.send("respond with a resource");
// });

router.get("/register", auth.isLogout, userController.loadRegister);

router.post("/register", userController.insertUser);
router.get("/verify", userController.verifyMail);
router.get("/register", auth.isLogout, userController.loadRegister);
router.get("/", auth.isLogout, userController.loadLogin);
router.get("/login", auth.isLogout, userController.loadLogin);
router.post("/login", userController.verifyLogin);
router.get("/home", auth.isLogin, userController.loadHome);
router.get("/logout", auth.isLogout, userController.userLogout);
router.get("/forget", userController.forgetLoad);
//router.get("/forget", auth.isLogOut, userController.forgetLoad);
router.post("/forget", userController.sendResetLink);
router.get(
  "/forget-password",
  auth.isLogout,
  userController.forgetPasswordLoad
);
router.post("/forget-password", userController.resetPassword);
router.get("/forget-password", userController.resetPassword);
router.get("/single-page", auth.isLogin, userController.viewSinglepage);
router.post("/add-cart", auth.isLogin, userController.addToCart);
router.get("/addtocart", auth.isLogin, userController.viewaddToCart);
router.post(
  "/change-product-quantity",
  auth.isLogin,
  userController.changeProductQuantity
);
router.get("/user-profile", auth.isLogin, userController.viewuserProfile);
router.post("/user-edit", auth.isLogin, userController.editUser);
router.get("/address", auth.isLogin, userController.loadAddressList);
router.post("/address", userController.addingAddress);
router.post("/add-new-address", userController.addingNewAddress);
router.get("/delete-address", auth.isLogin, userController.deletingAddress);
router.post("/edit-address", userController.changingTheAddress);
router.post("/set-as-default", userController.settingAsDefault);
router.get("/checkout", auth.isLogin, userController.loadingCheckoutPage);

module.exports = router;
