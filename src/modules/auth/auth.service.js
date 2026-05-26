const bcrypt = require("bcrypt");
const ApiError = require("../../utils/apiError");
const User = require("./user.model");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  shopName: user.shopName,
  role: user.role,
  createdAt: user.createdAt,
});

const register = async (payload) => {
  const exists = await User.exists({ email: payload.email });
  if (exists) throw new ApiError(409, "Email already registered");

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await User.create({ ...payload, password: hashedPassword });
  return publicUser(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  return publicUser(user);
};

module.exports = { register, login, publicUser };
