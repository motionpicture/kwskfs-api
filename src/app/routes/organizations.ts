/**
 * 組織ルーター
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';

const organizationsRouter = Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

organizationsRouter.use(authentication);

/**
 * 組織検索
 */
organizationsRouter.get(
    '/:organizationType',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
            const organizations = await organizationRepo.search({
                typeOf: req.params.organizationType,
                identifiers: (Array.isArray(req.query.identifiers)) ? req.query.identifiers : [],
                limit: parseInt(req.query.limit, 10)
            });
            res.json(organizations);
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
