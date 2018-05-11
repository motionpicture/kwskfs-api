"use strict";
/**
 * 404ハンドラーミドルウェア
 * @module middlewares.notFoundHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
const kwskfs = require("@motionpicture/kwskfs-domain");
exports.default = (req, __, next) => {
    next(new kwskfs.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
