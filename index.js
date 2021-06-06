#!/usr/bin/node

const http = require("http");
const node_static = require("node-static");

const mongo = require("mongodb").MongoClient;

let server_url = "mongodb://localhost:27017";

let chat_db;

mongo.connect(server_url, (err, server) => {
	if (err){
		console.log("Error en la conexión a MongoDB");
		throw err;
	}

	console.log("Dentro de MongoDB");

	chat_db = server.db("amongmeme");
});



console.log("Inicializando servidor chat");


let public_files = new node_static.Server("pub");

http.createServer( (request, response) => {
	if (request.url.startsWith("/history")){
		const estimated_count = chat_db.collection("chat").estimatedDocumentCount();
		estimated_count.then( (count) => {
			console.log(count);
			const MAX = 5;
			let cursor = chat_db.collection("chat").find({}, {
				sort: { $natural:1 }
			});

			cursor.toArray().then( (data) => {
				response.writeHead(200, {'Content-Type': 'text/html'});
				for (let i = 0; i < data.length; i++){
					let unixTimestamp = data[i].date;
					let finalDate = new Date(unixTimestamp);
					let humanFormat = finalDate.toLocaleString("es-ES", {timeZoneName: "short"});
					let nameUser = data[i].user;
					let msgUser = data[i].msg;
					let finalMessage = "<li><b>"+humanFormat+"</b> | "+nameUser+": "+msgUser+"</li>";
					response.write( finalMessage ); 
				}
				response.end();
			});
		});


		return;
	}

	if (request.url.startsWith("/chat")){
		let info = request.url.split("=");
		console.log(info[1]);

		let query = {
			date : { $gt : parseInt(info[1]) }
		};

		let cursor = chat_db.collection("chat").find(query);

		cursor.toArray().then( (data) => {
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.write( JSON.stringify(data) );
			response.end();
		});
		return;
	}


	if (request.url == "/recent"){
		const estimated_count = chat_db.collection("chat").estimatedDocumentCount();
	
		estimated_count.then( (count) => {
			console.log(count);

			const MAX = 5;

			let cursor = chat_db.collection("chat").find({}, {
					skip: count - MAX,
					limit: MAX,
					sort: { $natural:1 }
				});
	
			cursor.toArray().then( (data) => {
				response.writeHead(200, {'Content-Type': 'text/plain'});

				response.write( JSON.stringify(data) );

				response.end();
			});

		});

		return;
	}




	if (request.url == "/submit"){
		console.log("Envío de datos");

		let body = [];
		request.on('data', (chunk) => {

			body.push(chunk);

		}).on('end', () => {
			
			let chat_data = JSON.parse(Buffer.concat(body).toString());

			chat_db.collection("chat").insertOne({
				user: chat_data.chat_user,
				msg: chat_data.chat_msg,
				date: Date.now()
			});			 

		});

		response.end();

		return;
	}
	



	public_files.serve(request, response);

}).listen(6891);
