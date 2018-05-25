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
	
	puppeteer.launch().then(browser => {
		browser.newPage().then(page => {
			page.setViewport({ width: 1920, height: 1080}).then(() => {
				page.goto(configFile[key].analysis+"/traklog-track-the-stories").then(() => {

					// get tracklog save to folder
					page.screenshot({path : folder+"/traklog.png"}).then(() => {
						console.log("Traklog saved");
						browser.newPage().then(page => {
							page.setViewport({ width: 1920, height: 1080}).then(() => {
								page.goto(configFile[key].analysis+"/sprint-execution-diagram").then(() => {
									page.waitFor(10000).then(() => {
										// get sprint execution diagram save to folder
										page.screenshot({path : folder+"/sprint-execution-diagram.png"}).then(() => {
											console.log("Sprint Execution Diagram saved");
											browser.newPage().then(page => {
												page.setViewport({ width: 1920, height: 1080}).then(() => {
													page.goto(configFile[key].analysis+"/sprint-execution-diagram?highlightWeekends=true").then(() => {
														page.waitFor(10000).then(() => {
															// get sprint exec diagram with highlighted weekends save to folder
															page.screenshot({path : folder+"/sprint-execution-diagram-weekends.png"}).then(() => {
																console.log("Sprint Execution Diagram with highlighted weekends saved");
																browser.close();
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
		//madonna madonna no - pyramid of doom
	});

	// get retro-Reveal.js template
	fs.readFile("retro.tmpl","utf8", (err, src) => {
		var template = handlebars.compile(src);

		var result = template({retroTitle : ARGUMENTS("title")});
		fs.writeFile(folder+"/retro.html", result, function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    console.log("The template moved!");
		}); 
	})
	
});

// process through mustache for customization
// save as html file in filder