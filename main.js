const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');		// development only
//const AbiProvider = require('eosjs/src/abi.abi.json');				// development only

const fetch = require('node-fetch');									// node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');					// node only; native TextEncoder/Decoder

require('dotenv').config()

//TODO: Validate config
var colors = require('colors');

// Setup signatures, using cosigner if available
let privateKeys = [];
let cosign = false;
if (process.env.EOSIO_COSIGN_PRIV_KEY !== undefined) {
    cosign = true;
    privateKeys.push(process.env.EOSIO_COSIGN_PRIV_KEY);
}
privateKeys.push(process.env.EOSIO_PRIV_KEY);
const signatureProvider = new JsSignatureProvider(privateKeys);

var api_endpoint = `${ process.env.EOSIO_PROTOCOL||"http"}://${ process.env.EOSIO_HOST||"127.0.0.1"}:${process.env.EOSIO_PORT||"8888"}`;

const rpc = new JsonRpc(api_endpoint, { fetch });

const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

var crypto = require('crypto');
var fs = require('fs');

// Setup authorization, using cosigner if available
let authorization = [];
if (cosign) {
    authorization.push({
        actor: process.env.EOSIO_COSIGN_ACCOUNT,
        permission: process.env.EOSIO_COSIGN_PERMISSION,
    });
}
authorization.push({
	actor: `${process.env.ORACLE_NAME}`,
	permission: `${process.env.ORACLE_PERMISSION||"active"}`,
});

async function executeWritehash(hash, reveal){

	var obj = {
		actions: [{
			account: process.env.ORACLE_CONTRACT,
			name: 'writehash',
			authorization: authorization,
			data: {
				owner: process.env.ORACLE_NAME,
				hash: hash,
				reveal: reveal
			},
		}]
	}

	console.log("executeWritehash", JSON.stringify(obj, null, 2));

	const result = await api.transact(obj, {
		blocksBehind: 3,
		expireSeconds: 30,
	}).catch((err) => {
		console.error(`Error [writeHash]: ${err.json.error.what}`, JSON.stringify(err, null, 2));
		return {error: err};
	});

	return result;

}

async function executeForfeit(){

	var obj = {
		actions: [{
			account: process.env.ORACLE_CONTRACT,
			name: 'forfeithash',
			authorization: authorization,
			data: {
				owner: process.env.ORACLE_NAME
			}
		}]
	}

	console.log("executeForfeit", JSON.stringify(obj, null, 2));

	try{
		fs.unlinkSync(`${__dirname}/cache.txt`);
	}
	catch (ex) {

	}

	const result = await api.transact(obj, {
		blocksBehind: 3,
		expireSeconds: 30,
	}).catch((err) => {
		console.error(`Error [forfeitHash]: ${err.json.error.what}`, JSON.stringify(err, null, 2));
		return {error: err};
	});

	return result;

}

function randomValueHex(len) {
	return crypto
		.randomBytes(Math.ceil(len / 2))
		.toString('hex') // convert to hexadecimal format
		.slice(0, len) // return required number of characters
}

async function getCachedSecret() {
	return new Promise((resolve, reject) => {
		fs.readFile(`${__dirname}/cache.txt`, function(err, res) {
			if(err) return reject(err);

			resolve(res.toString());
		});
	}).catch((err) => {
		console.error("Error [getCachedSecret]:", JSON.stringify(err, null, 2));
		return "";
	});
		
}

async function run(forfeit){

	if (forfeit) await executeForfeit();

	var reveal = await getCachedSecret(); // get cached secret from cached.txt or return empty string
    let accountName = process.env.ORACLE_NAME;
    if (cosign) {
        accountName = process.env.EOSIO_COSIGN_ACCOUNT;
    }
	var accountInfo = await rpc.get_account(accountName);
	var cpuAvailable = (accountInfo.cpu_limit.available / accountInfo.cpu_limit.max) * 100;

	console.log(`${accountName} has ${cpuAvailable}% CPU available`);

	if (cpuAvailable < process.env.ORACLE_MINIMUM_CPU_PERCENT) return; // do not execute if cpu too low

	var secret = randomValueHex(64);
	var hash = crypto.createHash('sha256').update(secret).digest('hex');

	res = await executeWritehash(hash, reveal)

	if (!res.error) {
		console.log(JSON.stringify(res, null, 2));
		// cache secret to file for next run
		fs.writeFile(`${__dirname}/cache.txt`, secret, function(err) {
			if(err) return console.log(JSON.stringify(err, null, 2));
			return res;
		});
	}
	else if (res.error.json.error.details[0].message.indexOf("hash mismatch")!=-1){
		run(true);
	}
	else if (res.error.json.error.details[0].message.indexOf("reveal must be empty")!=-1){

		try{
			fs.unlinkSync(`${__dirname}/cache.txt`);
		}
		catch (ex) {

		}
		
		run(false);
	}

}

if (process.argv[2] == "--forfeit") run(true);
else run (false);