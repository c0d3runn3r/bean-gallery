var config=require("./config.json");
var multer=require("multer");
var storage=multer.memoryStorage();
var upload=multer({ "storage" : storage });
var upload=multer();
var express=require("express");
var app=new express();
var Promise=require("bluebird");
var cassandra=Promise.promisifyAll(require("cassandra-driver"));
var fs=Promise.promisifyAll(require("fs"));
var db=new cassandra.Client({ 
	"contactPoints": config.cassandra.contact_points,
	"keyspace": config.cassandra.keyspace,
	"authProvider":new cassandra.auth.PlainTextAuthProvider(config.cassandra.username, config.cassandra.password)
});
var log=require("bunyan").createLogger({"name":"bean-gallery"});
var uuid=require("node-uuid");

app.use(express.static("public"));	// Serve static files from the public folder
//app.use(multer({ limits: { "dest" : "uploads/", filesize: 20000000 }}).single("file"));	// Multipart middleware for uploads
app.use(multer({ limits: { "storage" : storage, filesize: 20000000 }}).single("file"));	// Multipart middleware for uploads



// Uploads
app.post("/upload", function(req,res) {

	log.info("Upload received");
//	log.info(JSON.stringify(req.file));

	if(!req.file){

		log.error("Invalid or empty file submitted");
		res.json({"error" : "No file found"});
		return;
	}

	var metadata={


				//"filename"		:	req.file.filename,
				"title"			:	(req.body.title||"Untitled"),
				"description"	:	(req.body.description||""),
				"image"			:	{					

					"filename"		:	req.file.originalname,
					"type"			:	req.file.mimetype,
					"size"			:	req.file.size,
				}
			};

	db.executeAsync("INSERT INTO art (id, image, metadata) VALUES (NOW(),?,?)",[req.file.buffer,JSON.stringify(metadata)])
		.then(function (result){

			res.json(metadata);

		})
		.catch(function(err){

			log.error(err);
			res.status(500).json({"error" : "Could not save image", "object": err});

		});


});


// API
app.get("/art",function(req, res){

	db.executeAsync("SELECT id, metadata from art")
		.then(function (result){

			var items=result.rows.map(function(o){ return { "id": o.id, "metadata": JSON.parse(o.metadata) }; });

			res.send({"items": items});
		})
		.catch(function(err){

			log.error(err);
			res.status(500).json({"error" : "Database error", "object": err});

		});
});

// Deep links map to index.html
app.get("/:id", function(req, res){

	res.sendfile("index.html", { "root": "./public"});

});


app.get("/art/:id/:part",function(req, res){


	db.executeAsync("SELECT id, metadata"+((req.params.part=="image")?(", image"):"")+" FROM art "+((req.params.id=="latest")?"LIMIT 1":"WHERE id=?"), ((req.params.id=="latest")?[]:[req.params.id]))
		.then(function (result){

			var metadata=JSON.parse(result.rows[0].metadata);
			metadata.id=result.rows[0].id;

			if(req.params.part=="image") {

				res.setHeader("Content-Type",metadata.image.type);
				res.writeHead(200);
				res.end(result.rows[0].image);

			} else {

				res.send(metadata);
			}

		})
		.catch(function(err){

			log.error(err);
			res.status(500).json({"error" : "Database error", "object": err});

		});

});




var server=app.listen(process.env.PORT || config.server.port || 80, function (){

	log.info("Listening on %s",server.address().port);

});





