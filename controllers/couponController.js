//const { response } = require("../../app");
const couponHelper = require("../helpers/adminHelper/coupenHelper");
const userHelpers = require("../helpers/userHelper");
const Coupon = require("../models/couponModel");

module.exports = {
  // get coupon
  getAddCoupon: (req, res) => {
    let admin = req.session.admin;

    res.render("admin/couponAdd", { layout: "adminlayout", admin });
  },
  coupon_activate: async (req, res) => {
    try {
      const id = req.query.id;
      console.log("activate", id);
      await Coupon.findByIdAndUpdate(
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
  },
  coupon_inactivate: async (req, res) => {
    try {
      const id = req.query.id;
      await Coupon.findByIdAndUpdate(
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
  },
  // generate coupon
  generatorCouponCode: (req, res) => {
    couponHelper.generatorCouponCode().then((couponCode) => {
      res.send(couponCode);
    });
  },

  // post coupon
  postaddCoupon: (req, res) => {
    let data = {
      couponCode: req.body.coupon,
      validity: req.body.validity,
      minPurchase: req.body.minPurchase,
      minDiscountPercentage: req.body.minDiscountPercentage,
      maxDiscountValue: req.body.maxDiscount,
      description: req.body.description,
    };
    couponHelper.postaddCoupon(data).then((response) => {
      res.send(response);
    });
  },

  getCouponLists: (req, res) => {
    let admin = req.session.admin;
    couponHelper.getCouponList().then((couponList) => {
      res.render("admin/couponList", {
        layout: "adminlayout",
        admin,
        couponList,
      });
    });
  },
  getCouponList: async (req, res) => {
    try {
      const couponList = await Coupon.find().lean();
      console.log(couponList, "couponList....................");
      res.render("admin/couponList", {
        layout: "adminlayout",
        couponList,
      });
    } catch (error) {
      console.error(error.message);
      res.render("error", { message: "Error loading user list" }); // Render an error page with a suitable error message
    }
  },
  removeCoupon: (req, res) => {
    let couponId = req.body.couponId;
    couponHelper.removeCoupon(couponId).then((response) => {
      res.send(response);
    });
  },
  verifyCoupon: (req, res) => {
    let couponCode = req.params.id;
    console.log("couponcode..........", couponCode);
    let userId = req.session.user_id;
    console.log("useridddddddddddd", userId);
    couponHelper.verifyCoupon(userId, couponCode).then((response) => {
      res.send(response);
      // console.log("response", response);
    });
  },

  applyCoupon: async (req, res) => {
    let couponCode = req.params.id;
    let userId = req.session.user_id;
    let total = await userHelpers.getCartValue(userId);
    console.log(total);
    couponHelper.applyCoupon(couponCode, total).then((response) => {
      res.send(response);
      console.log(response);
    });
  },
};
