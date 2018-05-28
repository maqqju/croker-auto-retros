var fs = require("fs");
var puppeteer = require("puppeteer");
var handlebars = require("handlebars");

var ARGUMENTS = ((args) => {
	return (name) => {
		var argument = args.find((arg) => arg.name === name);
		return argument ? argument.value : "";
	}
})(process.argv.filter((arg) => !!arg.match(/.+=.+/g))
							.map((arg) => {
								var a = arg.split("="); 
								return { 
									name : a[0].trim(),
									value : a[1].trim()
								}
							}));

fs.readFile("croker-retro-config.json","utf8",(err,data) => {
	if (err) {
		return console.log(err);
	}

	var configFile = JSON.parse(data);

	if (Object.keys(configFile).length === 0) {
		return console.error("Can not load cretl-reporting-server without proper coker-retro-config.json. Please make sure you define [contexts].");
	}

	var key = ARGUMENTS("team") ? ARGUMENTS("team") : Object.keys(configFile)[0];
	var folder = ARGUMENTS("folder") ? ARGUMENTS("folder")  : "croker-retro-"+Date.now();

	// create folder
	fs.mkdirSync(folder);

	(async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080});
		await page.goto(configFile[key].analysis + "/traklog-track-the-stories");
		await page.screenshot({path : folder+"/traklog.png"});
		console.log("Traklog saved");
		await browser.close();
	})();

	(async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080});
		await page.goto(configFile[key].analysis + "/sprint-execution-diagram");
		await page.waitFor(5000);
		await page.screenshot({path : folder+"/sprint-execution-diagram.png"});
		console.log("Sprint Execution Diagram saved");	
		await browser.close();	
	})();

	(async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080});
		await page.goto(configFile[key].analysis + "/sprint-execution-diagram?highlightWeekends=true");
		await page.waitFor(5000);
		await page.screenshot({path : folder+"/sprint-execution-diagram-weekends.png"});
		console.log("Sprint Execution Diagram with highlighted weekends saved");
		await browser.close();
	})();

	// get retro-Reveal.js template
	fs.readFile("retro.tmpl","utf8", (err, src) => {
		// process through handlebars for customization
		var template = handlebars.compile(src);

		var result = template({retroTitle : ARGUMENTS("title")});
		// save as html file in filder
		fs.writeFile(folder+"/retro.html", result, function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    console.log("The template moved!");
		}); 
	})
	
});
