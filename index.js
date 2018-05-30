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

/**
 * [saveSlides description]
 * @param  {[type]} slideConfigurations [description]
 * @return {[type]}                     [description]
 */
function saveSlides(slideConfigurations, folder) {
	// get retro-Reveal.js template
	fs.readFile("slide.tmpl","utf8", (templateError, templateSource) => {
		var slideTemplate = handlebars.compile(templateSource);
		var slides = slideConfigurations ? new handlebars.SafeString(slideConfigurations.map((slide) => slideTemplate({slideImage : slide.imageName, externalUrl : slide.externalUrl || "", comment : slide.comment || "", title : slide.title || ""})).join("\n")) : "";

		fs.readFile("retro.tmpl","utf8", (err, src) => {
			// process through handlebars for customization
			var template = handlebars.compile(src);
			var retroData = {
				retroTitle : ARGUMENTS("title") || "Retrospective", 
				retroSubtitle : ARGUMENTS("subtitle") || "",
				dataSlides : slides
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
	})
}

var CONFIGURATIONS = ARGUMENTS("config") ? ARGUMENTS("config").split(",") : [];
var TEAM = ARGUMENTS("team") ? ARGUMENTS("team") : Object.keys(configFile)[0];
var FOLDER = ARGUMENTS("folder") ? ARGUMENTS("folder")  : ["croker-retro",TEAM,Date.now()].join("-");
// create folder
fs.mkdirSync(FOLDER);

var allSlides = CONFIGURATIONS.map((fileName) => JSON.parse(fs.readFileSync(fileName,"utf8")))
							  .filter((jsonConfig) => jsonConfig[TEAM])
							  .map((jsonConfig) => jsonConfig[TEAM])
							  .map((jsonConfig) => jsonConfig.slides)
							  .reduce((allSlides, slideConfig) => { return [].concat(allSlides, slideConfig)}, []);

allSlides.filter((slide) => slide.url)
		 .map((slide) => {
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


					await page.screenshot({path : FOLDER+"/"+slide.imageName});
					console.log(`[${slide.imageName}] saved!`);
					await browser.close();
				})
		}).forEach((saveImage) => {
			saveImage();
		});

saveSlides(allSlides, FOLDER);