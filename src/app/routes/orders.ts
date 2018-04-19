/**
 * orders router
 * @module ordersRouter
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const ordersRouter = Router();
ordersRouter.use(authentication);

/**
 * make inquiry of an order
 */
ordersRouter.post(
    '/findByOrderInquiryKey',
    permitScopes(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']),
    (req, _, next) => {
        req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
        req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
        req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const phoneUtil = PhoneNumberUtil.getInstance();
            const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
            // kwskfs-domain@v22のデータとの互換性維持のため、いったんコメントアウト
            // tslint:disable-next-line:no-suspicious-comment
            // TODO v22のデータが全て上映終了すれば元に戻してよい
            // if (!phoneUtil.isValidNumber(phoneNumber)) {
            //     next(new Error('invalid phone number format'));

            //     return;
            // }

            const key = {
                theaterCode: req.body.theaterCode,
                confirmationNumber: req.body.confirmationNumber,
                telephone: phoneUtil.format(phoneNumber, PhoneNumberFormat.E164)
            };

            const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);
            await repository.findByOrderInquiryKey(key).then((order) => {
                res.json(order);
            });
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
