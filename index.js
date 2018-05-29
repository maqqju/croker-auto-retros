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

	if (Object.keys(configFile).length === 0 || !configFile[ARGUMENTS("team")]) {
		return console.error(`Can not load croker-retrospective without proper croker-retro-config.json. Please make sure you define team configuration for [${ARGUMENTS("team")}].`);
	}

	var key = ARGUMENTS("team") ? ARGUMENTS("team") : Object.keys(configFile)[0];
	var folder = ARGUMENTS("folder") ? ARGUMENTS("folder")  : ["croker-retro",key,Date.now()].join("-");

	// create folder
	fs.mkdirSync(folder);

	if (configFile[key].slides) {
		configFile[key].slides.map((slide) => {
			return (async () => {
				const browser = await puppeteer.launch();
				const page = await browser.newPage();
				await page.setViewport({ width: 1920, height: 1080});
				await page.goto(slide.url);

				if (slide.authentication) {
					//Assuming that the entry is in base64 encoding (used in basic authentication)
					//the format should be username:password once decoded
					var authentication = Buffer.from(slide.authentication.basic,"base64").toString().split(":");
					await page.type(slide.authentication.username, authentication[0]);
					await page.type(slide.authentication.password, authentication[1]);
					await page.click(slide.authentication.submit);
				}

				if (slide.delay) {
					await page.waitFor(slide.delay);
				}


				await page.screenshot({path : folder+"/"+slide.imageName});
				console.log(`[${slide.imageName}] saved!`);
				await browser.close();
			})
		}).forEach((saveImage) => {
			saveImage();
		});
	}

	// get retro-Reveal.js template
	fs.readFile("retro.tmpl","utf8", (err, src) => {
		// process through handlebars for customization
		var template = handlebars.compile(src);
		var retroData = {
			retroTitle : ARGUMENTS("title") || "Retrospective Title", 
			retroSubtitle : ARGUMENTS("subtitle") || "",
			dataSlides : configFile[key].slides ? new handlebars.SafeString(configFile[key].slides.map((slide) => `<section data-background-image=\"${slide.imageName}\"></section>`).join("\n")) : ""
		}
		var result = template(retroData);
		// save as html file in filder
		fs.writeFile(folder+"/retro.html", result, function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    console.log("The template moved!");
		}); 
	})
	
});
