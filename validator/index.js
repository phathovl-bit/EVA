const examValidator = require("./examValidator");
const demoData = require("./demoData");
const runValidationDemo = require("./demoRunner");

module.exports = {
  ...examValidator,
  demoData,
  runValidationDemo
};

