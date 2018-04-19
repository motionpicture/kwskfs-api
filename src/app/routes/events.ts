/**
 * event router
 * イベントルーター
 * @module eventsRouter
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import * as moment from 'moment';

import * as redis from '../../redis';
import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const eventsRouter = Router();
eventsRouter.use(authentication);

eventsRouter.get(
    '/individualScreeningEvent/:identifier',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            await kwskfs.service.offer.findIndividualScreeningEventByIdentifier(req.params.identifier)({
                event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
                itemAvailability: new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.getClient())
            }).then((event) => {
                res.json(event);
            });
        } catch (error) {
            next(error);
        }
    });

eventsRouter.get(
    '/individualScreeningEvent',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    (req, __, next) => {
        req.checkQuery('startFrom').optional().isISO8601().withMessage('startFrom must be ISO8601 timestamp');
        req.checkQuery('startThrough').optional().isISO8601().withMessage('startThrough must be ISO8601 timestamp');
        req.checkQuery('endFrom').optional().isISO8601().withMessage('endFrom must be ISO8601 timestamp');
        req.checkQuery('endThrough').optional().isISO8601().withMessage('endThrough must be ISO8601 timestamp');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 互換性維持のために<any>で一時対応
            // dayとtheaterを削除する
            const events = await kwskfs.service.offer.searchIndividualScreeningEvents(<any>{
                day: req.query.day,
                theater: req.query.theater,
                name: req.query.name,
                startFrom: (req.query.startFrom !== undefined) ? moment(req.query.startFrom).toDate() : undefined,
                startThrough: (req.query.startThrough !== undefined) ? moment(req.query.startThrough).toDate() : undefined,
                endFrom: (req.query.endFrom !== undefined) ? moment(req.query.endFrom).toDate() : undefined,
                endThrough: (req.query.endThrough !== undefined) ? moment(req.query.endThrough).toDate() : undefined,
                eventStatuses: (Array.isArray(req.query.eventStatuses)) ? req.query.eventStatuses : undefined,
                superEventLocationIdentifiers:
                    (Array.isArray(req.query.superEventLocationIdentifiers)) ? req.query.superEventLocationIdentifiers : undefined,
                workPerformedIdentifiers:
                    (Array.isArray(req.query.workPerformedIdentifiers)) ? req.query.workPerformedIdentifiers : undefined
            })({
                event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
                itemAvailability: new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.getClient())
            });

            res.json(events);
        } catch (error) {
            next(error);
        }
    }
);

export default eventsRouter;
