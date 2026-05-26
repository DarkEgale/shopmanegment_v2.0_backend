const asyncHandler = require("../../utils/asyncHandler");
const sendResponse = require("../../utils/apiResponse");
const generateToken = require("../../utils/jwt");
const cookieOptions = require("../../utils/cookie");
const authService = require("./auth.service");

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.validated.body);
  const token = generateToken(user.id);
  res.cookie("token", token, cookieOptions);
  sendResponse(res, 201, "Registered successfully", { user });
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.validated.body);
  const token = generateToken(user.id);
  res.cookie("token", token, cookieOptions);
  sendResponse(res, 200, "Logged in successfully", { user });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", cookieOptions);
  sendResponse(res, 200, "Logged out successfully");
});

const me = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Profile loaded", {
    user: authService.publicUser(req.user),
  });
});

module.exports = { register, login, logout, me };
