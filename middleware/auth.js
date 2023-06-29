const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      //   console.log(req.session.user_id);
    } else {
      res.redirect("/login");
    }
    next();
  } catch (error) {
    console.log(error.message);
  }
};
const isLogout = async (req, res, next) => {
  try {
    // console.log(req.session);
    if (req.session.user_id) {
      res.redirect("/home");
    }
    next();
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = {
  isLogin,
  isLogout,
};
