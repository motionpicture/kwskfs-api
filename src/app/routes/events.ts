/**
 * イベントルーター
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';

import * as redis from '../../redis';
import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const eventsRouter = Router();
eventsRouter.use(authentication);

/**
 * イベントタイプでイベント検索
 */
eventsRouter.get(
    '/:eventType',
    permitScopes(['admin', 'aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
            const events = await eventRepo.search({
                typeOf: req.params.eventType,
                identifiers: (Array.isArray(req.query.identifiers)) ? req.query.identifiers : [],
                limit: parseInt(req.query.limit, 10)
            });
            res.json(events);
        } catch (error) {
            next(error);
        }
    });

/**
 * イベントの販売情報取得
 */
eventsRouter.get(
    '/:eventType/:eventIdentifier/offers',
    permitScopes(['admin', 'aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const offers = await kwskfs.service.offer.searchEventOffers({
                eventType: req.params.eventType,
                eventIdentifier: req.params.eventIdentifier
            })({
                event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
                organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
                offerItemAvailability: new kwskfs.repository.itemAvailability.Offer(redis.getClient())
            });
            res.json(offers);
        } catch (error) {
            next(error);
        }
    });

/**
 * イベント販売情報の在庫状況変更
 */
eventsRouter.put(
    '/:eventType/:eventIdentifier/offers/:organizationId/menuItem/:menuItemIdentifier/:offerIdentifier/availability/:availability',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
            const itemAvailabilityRepo = new kwskfs.repository.itemAvailability.Offer(redis.getClient());

            // イベント終了日時まで値が保管されるように
            const event = await eventRepo.findByIdentifier(req.params.eventType, req.params.eventIdentifier);
            const now = moment();
            const ttl = moment(event.endDate).add(1, 'day').diff(now, 'seconds');

            await itemAvailabilityRepo.storeByMenuItemOfferIdentifier(
                req.params.organizationId,
                req.params.menuItemIdentifier,
                req.params.offerIdentifier,
                req.params.availability,
                ttl
            );
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    });

export default eventsRouter;
