/**
 * orders router
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import * as moment from 'moment';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const ordersRouter = Router();
ordersRouter.use(authentication);

/**
 * make inquiry of an order
 */
// ordersRouter.post(
//     '/findByOrderInquiryKey',
//     permitScopes(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']),
//     (req, _, next) => {
//         req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
//         req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
//         req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');

//         next();
//     },
//     validator,
//     async (req, res, next) => {
//         try {
//             const phoneUtil = PhoneNumberUtil.getInstance();
//             const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');

//             const key = {
//                 theaterCode: req.body.theaterCode,
//                 confirmationNumber: req.body.confirmationNumber,
//                 telephone: phoneUtil.format(phoneNumber, PhoneNumberFormat.E164)
//             };

//             const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);
//             await repository.findByOrderInquiryKey(key).then((order) => {
//                 res.json(order);
//             });
//         } catch (error) {
//             next(error);
//         }
//     }
// );

/**
 * 注文検索
 */
ordersRouter.get(
    '',
    permitScopes(['admin']),
    (req, __2, next) => {
        req.checkQuery('orderDateFrom').notEmpty().withMessage('required').isISO8601().withMessage('must be ISO8601');
        req.checkQuery('orderDateThrough').notEmpty().withMessage('required').isISO8601().withMessage('must be ISO8601');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
            const orders = await orderRepo.search({
                sellerId: req.query.sellerId,
                customerId: req.query.customerId,
                orderNumber: req.query.orderNumber,
                orderStatus: req.query.orderStatus,
                orderDateFrom: moment(req.query.orderDateFrom).toDate(),
                orderDateThrough: moment(req.query.orderDateThrough).toDate()
            });
            res.json(orders);
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
