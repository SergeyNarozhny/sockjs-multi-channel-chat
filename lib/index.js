const http = require('http');
const moment = require('moment');
const server = http.createServer();
const sockjs = require('sockjs');
const redis = require('redis');

// Here put your db realization,
// I used pg-promise for postgresql
const pgsql = require('../db');

const channelPostfix = ':messages';

// Pub && sub redis clients
const pub = redis.createClient();
const sub = redis.createClient();

// Subscribe to all incoming messages, and publish them to our internal pubsub
sub.psubscribe('*');

// Initialize store
const store = redis.createClient();

// Internal data
let clients = {};
let users = {};

// create sockjs server
const echo = sockjs.createServer();

// Used in case of initializatin and delete action
store.on('ready', () => {
	//deleteMessages('dreamhackcs');

	// go get users logins && avatars from db
	const usersPromise = pgsql.selectAny({
		fields: ['login', 'avatar'],
		table: 'user'
	});
	usersPromise.then(data => {
		if (data && data.length) {
			data.forEach(user => {
				users[user.login] = user;
			});
		}
	}).catch(error => {
		Promise.reject(error);
		console.log(error, 'Error: ');
	});
});

// Handler of all incoming messages
sub.on('pmessage', (pattern, channel, message) => {

	// Store received messages for each channel
	// Store with redis zadd
	// And use current timestamp as score
	const msg = JSON.parse(message);
	if (!msg.method) {
		store.zadd([
			channel + channelPostfix,
			moment().unix(),
			message
		], (err, result) => {
			// custom cb can be placed
			// console.log('zadd err:', err);
		});
	}
});

/**
 * Broadcast message to the client
 * @param  {client<String>} connection.id
 * @param  {message<Object>} parsed message
 */
function broadcast(client, message) {
	if (clients[client]) {
		// ...

		clients[client].write(JSON.stringify(message));
	}
}

// Delete messages
// For the last 28 days by default
function deleteMessages(channel) {
	store.zremrangebyscore([
		channel + channelPostfix,
		moment().subtract(28, 'days').unix(),
		moment().unix()
	], (err, result) => {
		// custom cb can be placed
		// console.log('zremrangebyscore err:', err);
	});
}

// Get chat data on connection and push to client
function getAndBroadcastChatData(channel, client) {
	// Push msgs for the last 2 days to the client
	store.zrangebyscore([
		channel + channelPostfix,
		moment().subtract(2, 'days').unix(),
		moment().unix(),
		'WITHSCORES'
	], (err, result) => {
		if (!err && result && result.length) {
			result.forEach(message => {
				broadcast(client, JSON.parse(message))
			});
		}
	});
}

// On new connection event
echo.on('connection', (connection) => {

	// Create internalSub for every client
	const internalSub = redis.createClient();
	// Channel variable
	let channel;

	// add this client to clients object
	clients[connection.id] = connection;

	connection.on('data', (message) => {
		const dataObj = JSON.parse(message);

		// First message we receive is the channel message to subscribe
		if (dataObj.method && dataObj.method === 'set-channel') {
			channel = dataObj.channel;
			internalSub.subscribe(dataObj.channel);
			getAndBroadcastChatData(channel, connection.id);
		}
		else {

			// Otherwise
			// Publish to exact channel users
			pub.publish(channel, message);
		}
	});

	// Send incoming message to client 
	internalSub.on('message', (channel, message) => {
		const msg = JSON.parse(message);
		if (!msg.method) {
			broadcast(connection.id, msg); // message
			//broadcast(connection.id, moment().unix()); // time
		}
	});

	// On connection close event
	connection.on('close', () => {
		delete clients[connection.id];
	});

	connection.on('disconnect', () => {
		internalSub.quit();
		pub.publish(channel, 'User ' + connection.id + ' is disconnected');
	});

	connection.on('connect', () => {
		pub.publish(channel, 'User ' + connection.id + ' is connected');
	});
  
});

// Integrate SockJS and listen on /echo
echo.installHandlers(server, { prefix: '/echo' });

// Start server
server.listen(9999, '127.0.0.1', () => {
	console.log('chat is listening on port 9999');
});
