"use strict";
/**
 * 場所ルーター
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const placesRouter = express_1.Router();
// import * as kwskfs from '@motionpicture/kwskfs-domain';
const authentication_1 = require("../middlewares/authentication");
// import permitScopes from '../middlewares/permitScopes';
// import validator from '../middlewares/validator';
placesRouter.use(authentication_1.default);
// placesRouter.get(
//     '/movieTheater/:branchCode',
//     permitScopes(['aws.cognito.signin.user.admin', 'places', 'places.read-only']),
//     validator,
//     async (req, res, next) => {
//         try {
//             const repository = new kwskfs.repository.Place(kwskfs.mongoose.connection);
//             await repository.findMovieTheaterByBranchCode(req.params.branchCode).then((theater) => {
//                 res.json(theater);
//             });
//         } catch (error) {
//             next(error);
//         }
//     });
// placesRouter.get(
//     '/movieTheater',
//     permitScopes(['aws.cognito.signin.user.admin', 'places', 'places.read-only']),
//     validator,
//     async (__, res, next) => {
//         try {
//             const repository = new kwskfs.repository.Place(kwskfs.mongoose.connection);
//             await repository.searchMovieTheaters({}).then((places) => {
//                 res.json(places);
//             });
//         } catch (error) {
//             next(error);
//         }
//     }
// );
exports.default = placesRouter;
