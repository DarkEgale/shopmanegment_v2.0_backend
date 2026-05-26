const asyncHandler = require("../../utils/asyncHandler");
const sendResponse = require("../../utils/apiResponse");
const service = require("./statistics.service");

const getStatistics = asyncHandler(async (req, res) => {
  const statistics = await service.getStatistics(req.user.id);
  sendResponse(res, 200, "Statistics loaded", { statistics });
});

module.exports = { getStatistics };
