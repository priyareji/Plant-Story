var express = require("express");
var router = express.Router();
const adminController = require("../controllers/adminController");
const bcryptjs = require("bcrypt");
const config = require("../config/config");
const bodyParser = require("body-parser");
const session = require("express-session");
const adminAuth = require("../middleware/auth");
const multer = require("multer");
const multerr = require("../multer/multer");
const couponController = require("../controllers/couponController");
const productController = require("../controllers/productController");
//const couponHelper = require("../../helpers/adminHelper/couponHelper");

const path = require("path");
// router.use(bodyParser.json());

// router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({ secret: config.sessionSecret }));

/* GET home page. */
// router.get("/", function (req, res, next) {
//   res.render("admin", { title: "Express" });
// });
const Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploads = multer({ storage: Storage });

router.get("/", adminController.loadLogin);
router.post("/login", adminController.verifyLogin);
router.get("/home", adminController.loadDashboard);
router.get("/user-manage", adminController.loadUserManage);
router.get("/edit-user", adminController.editUser);
router.put("/edit-user", adminController.updatingUser);
router.get("/block-user", adminController.blockUser);
router.get("/blocked-userlist", adminController.blockUserlist);
router.get("/unblocked-userlist", adminController.unblockUserlist);
router.get("/product", adminController.loadproduct);
router.post(
  "/product",
  //adminAuth.adminLogin,
  uploads.array("image", 5),
  adminController.addproduct
);
router.get("/editproduct", adminController.editProductsView);
router.post(
  "/edit-product",
  uploads.array("image", 5),
  adminController.editProducts
);
router.post(
  "/editproduct",
  multerr.editeduploads,
  productController.postEditProduct
);
//upload.array('image')
router.get("/category", adminController.getcategory);
router.post(
  "/category",
  //adminAuth.adminLogin,
  uploads.single("image"),
  adminController.addcategory
);
router.get(
  "/categoryActivate",
  //adminAuth.adminLogin,
  adminController.category_activate
);
router.get(
  "/categoryInactivate",
  //adminAuth.adminLogin,
  adminController.category_inactivate
);
router.get(
  "/productActivate",
  //adminAuth.adminLogin,
  adminController.product_activate
);
router.get(
  "/productInactivate",
  //adminAuth.adminLogin,
  adminController.product_inactivate
);
router.get("/ordersList", adminController.loadOrdersList);
router.get(
  "/ordersView",
  // adminAuth.adminLogin,
  adminController.loadOrdersView
);

router.post(
  "/cancel-by-admin",
  //adminAuth.adminLogin,
  adminController.cancelledByAdmin
);
router.post(
  "/reject-by-admin",
  //adminAuth.adminLogin,
  adminController.rejectCancellation
);
router.post(
  "/prepare-by-admin",
  //adminAuth.adminLogin,
  adminController.packingOrder
);
router.post(
  "/deliver-by-admin",
  // adminAuth.adminLogin,
  adminController.deliveredOrder
);
router.post(
  "/return-conformedby-admin",
  // adminAuth.adminLogin,
  adminController.retunedConfirmation
);
/* GET Add Coupon Page. */
router.get("/add-coupon", couponController.getAddCoupon);
router.post(
  "/add-coupon",
  //  adminAuth.adminLogin,
  couponController.postaddCoupon
);
router.get(
  "/coupon-list",
  //adminAuth.adminLogin,
  couponController.getCouponList
);

router.get("/couponactivate", couponController.coupon_activate);
router.get("/couponInactivate", couponController.coupon_inactivate);
router.get(
  "/generate-coupon-code",
  // adminAuth.adminLogin,
  couponController.generatorCouponCode
);
router.delete(
  "/remove-coupon",
  //adminAuth.adminLogin,
  couponController.removeCoupon
);

// // get coupon list
// router
//   .route("/coupon-list")
//   .get(auth.adminAuth, couponController.getCouponList);

// // remove coupon
// router.route("/remove-coupon").delete(couponController.removeCoupon);
//
router.get("*", function (req, res) {
  res.redirect("/admin");
});

module.exports = router;
