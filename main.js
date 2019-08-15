
	//flow:

	//Validate config
	//Validate endpoint
	//Validate account, contract, token, etc...
	//Get contract state

	//Main loop
		//Do any remaining work
		//Commit to next workload
		//Sleep until end of mining period
		//Reveal commitment
		//Do work (throttle algo)



const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
//const AbiProvider = require('eosjs/src/abi.abi.json');      // development only

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

require('dotenv').config()

//TODO: Validate config
var colors = require('colors');
const defaultPrivateKey = process.env.EOSIO_PRIV_KEY; // bob
const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

var api_endpoint = `${ process.env.EOSIO_PROTOCOL||"http"}://${ process.env.EOSIO_HOST||"127.0.0.1"}:${process.env.EOSIO_PORT||"8888"}`;

const rpc = new JsonRpc(api_endpoint, { fetch });

const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

var crypto = require('crypto')

const TRX_AUTH_TEMPLATE = {
								        actor: `${process.env.ORACLE_NAME}`,
								        permission: `${process.env.ORACLE_PERMISSION||"active"}`,
								      }

async function executeWritehash(hash, reveal){

	var obj = {
    actions: [{
      account: process.env.ORACLE_CONTRACT,
      name: 'writehash',
      authorization: [TRX_AUTH_TEMPLATE],
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
  });

	return result;

}


function randomValueHex(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, len) // return required number of characters
}


function main(){

	var secret = randomValueHex(64);
	var hash = crypto.createHash('sha256').update(secret).digest('hex'); 
	var reveal = "";

	async function loop(){

			secret = randomValueHex(64);
			hash = crypto.createHash('sha256').update(secret).digest('hex');

			var res = await executeWritehash(hash, reveal);

			reveal = secret;

			console.log(JSON.stringify(res, null, 2));

	}

	loop();
	setInterval(loop, 60000);

}

main();