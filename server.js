var express = require('express')
var path = require('path')
var serveStatic = require('serve-static')

var app = express()

app.use(serveStatic(__dirname))
app.use((req,res,next) => {
	res.header("Access-Control-Allow-Origin", "*");
  	res.header("Access-Control-Allow-Headers", "Origin, X-Frame-Options, X-Requested-With, Content-Type, Accept");
  	res.header("X-Frame-Options","ALLOW-FROM *");
  	next();
});
// app.use(serveStatic(path.join(__dirname, 'public')))
app.listen(3000, () => {
	console.log("Server is up");
})