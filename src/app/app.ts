/**
 * Expressアプリケーション
 * @ignore
 */

import * as middlewares from '@motionpicture/express-middleware';
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as createDebug from 'debug';
import * as express from 'express';
import * as expressValidator from 'express-validator';
import * as helmet from 'helmet';

import mongooseConnectionOptions from '../mongooseConnectionOptions';

// import basicAuth from './middlewares/basicAuth';
import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';
import actionsRouter from './routes/actions';
import devRouter from './routes/dev';
import eventsRouter from './routes/events';
import healthRouter from './routes/health';
import ordersRouter from './routes/orders';
import organizationsRouter from './routes/organizations';
import peopleRouter from './routes/people';
import placesRouter from './routes/places';
import placeOrderTransactionsRouter from './routes/transactions/placeOrder';
import returnOrderTransactionsRouter from './routes/transactions/returnOrder';

const debug = createDebug('kwskfs-api:*');

const app = express();

app.use(middlewares.basicAuth({ // ベーシック認証
    name: process.env.BASIC_AUTH_NAME,
    pass: process.env.BASIC_AUTH_PASS,
    unauthorizedHandler: (__, res, next) => {
        res.setHeader('WWW-Authenticate', 'Basic realm="kwskfs-api Authentication"');
        next(new kwskfs.factory.errors.Unauthorized());
    }
}));

const options: cors.CorsOptions = {
    origin: '*',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token', 'Authorization'],
    credentials: false,
    methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(options));

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ['\'self\'']
        // styleSrc: ['\'unsafe-inline\'']
    }
}));
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
const SIXTY_DAYS_IN_SECONDS = 5184000;
app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
    includeSubdomains: false
}));

// api version
// tslint:disable-next-line:no-require-imports no-var-requires
const packageInfo = require('../../package.json');
app.use((__, res, next) => {
    res.setHeader('x-api-verion', <string>packageInfo.version);
    next();
});

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
    // サーバーエラーテスト
    app.get('/dev/uncaughtexception', (req) => {
        req.on('data', (chunk) => {
            debug(chunk);
        });

        req.on('end', () => {
            throw new Error('uncaughtexception manually');
        });
    });
}

// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');

app.use(bodyParser.json());
// The extended option allows to choose between parsing the URL-encoded data
// with the querystring library (when false) or the qs library (when true).
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!

// 静的ファイル
// app.use(express.static(__dirname + '/../../public'));

kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions)
    .then(() => { debug('MongoDB connected.'); })
    .catch(console.error);

// routers
app.use('/health', healthRouter);
app.use('/actions', actionsRouter);
app.use('/organizations', organizationsRouter);
app.use('/orders', ordersRouter);
app.use('/people', peopleRouter);
app.use('/places', placesRouter);
app.use('/events', eventsRouter);
app.use('/transactions/placeOrder', placeOrderTransactionsRouter);
app.use('/transactions/returnOrder', returnOrderTransactionsRouter);

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', devRouter);
}

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

export = app;
