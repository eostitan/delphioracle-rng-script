
var crypto = require('crypto')

if (process.argv[2] && process.argv[3]){

console.log("provided secret", process.argv[2]);
console.log("provided hash", process.argv[3]);

console.log("hashing secret...");

		var hash = crypto.createHash('sha256').update(process.argv[2]).digest('hex');

		console.log("resulting hash:", hash);

		if (hash ==process.argv[3]) console.log("Success. Secret matches hash");
		else console.log("Error. Invalid secret");

}
else {
	console.log("Must supply two parameters (secret + hash)");
}