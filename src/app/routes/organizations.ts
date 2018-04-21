/**
 * 組織ルーター
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import * as fs from 'fs';

const organizationsRouter = Router();

const restaurants: any[] = JSON.parse(
    fs.readFileSync(`${__dirname}/../../../data/organizations/restaurant.json`, 'utf8')
);

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

organizationsRouter.use(authentication);

organizationsRouter.get(
    '/movieTheater/:branchCode',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
            await repository.findMovieTheaterByBranchCode(req.params.branchCode).then((movieTheater) => {
                res.json(movieTheater);
            });
        } catch (error) {
            next(error);
        }
    });

organizationsRouter.get(
    '/movieTheater',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (__, res, next) => {
        try {
            const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
            await repository.searchMovieTheaters({
            }).then((movieTheaters) => {
                res.json(movieTheaters);
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * レストラン検索
 */
organizationsRouter.get(
    '/restaurant',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (__, res, next) => {
        try {
            res.json(restaurants);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * レストランに対する注文検索
 */
organizationsRouter.get(
    '/restaurant/:identifier/orders',
    permitScopes(['organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
            const orders = await orderRepo.orderModel.find({
                'acceptedOffers.itemOffered.provider.typeOf': 'Restaurant',
                'acceptedOffers.itemOffered.provider.identifier': req.params.identifier
            }).exec().then((docs) => docs.map((doc) => doc.toObject()));

            res.json(orders);
        } catch (error) {
            next(error);
        }
    }
);

export default organizationsRouter;
