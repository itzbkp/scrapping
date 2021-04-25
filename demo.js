const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const moment = require('moment');
const csvReader = require('csv-parser');
const csvWriter = require('csv-write-stream');
const jsonfile = require('jsonfile');
const { performance } = require('perf_hooks');
const { currentIndex, state, time } = require('./Scrapping/config.json');
const axios = require('axios');

puppeteer.use(require("puppeteer-extra-plugin-stealth")());
puppeteer.use(require('puppeteer-extra-plugin-recaptcha')({
    provider: {
        id: '2captcha',
        token: 'a772b39a12bbf3553c7b7416fce67b29'
    },
    visualFeedback: true
}));


(async function () {
    const consoleLogging = fs.createWriteStream('Scrapping/console.txt', { flags: 'a' })
    const consoleLogger = new console.Console(consoleLogging, consoleLogging);

    const inputURLs = [], inputIds = [], failedURLs = [], failedIds = [], headers = [], xpaths = [];
    let limit;

    if (!fs.existsSync("LinkedIn.csv"))
        await axios.get(
            'https://datacleaner.whoisvisiting.com/LinkedInPersonQueue.ashx', {
            params: {
                count: 1000
            },
            headers: {
                Authorization: 'BFCC45E1-DAB4-4303-A987-F1E50C6350E2'
            }
        })
            .then(({ data }) => {
                const writer = csvWriter();
                writer.pipe(fs.createWriteStream("LinkedIn.csv", { flags: 'a' }));
                for (let i = 0; i < data.length; i++)
                    writer.write(data[i]);
                writer.end();
                console.log(`Fetched: ${data.length} records`)
            })
            .catch(error => {
                consoleLogger.log(`${error.response.status}\n${error.response.statusText}`);
            })

    fs.createReadStream('LinkedIn.csv')
        .pipe(csvReader())
        .on('data', ({ LinkedInURL, URLID }) => {
            inputIds.push(URLID);
            inputURLs.push(LinkedInURL);
        })
        .on('end', () => {
            limit = inputURLs.length;
            fs.createReadStream(`Scrapping/Retry.csv`)
                .pipe(csvReader())
                .on('data', (url) => {
                    failedIds.push(Object.values(url)[0]);
                    inputURLs.push(Object.values(url)[1]);
                    inputIds.push(Object.values(url)[2]);
                })
                .on('error', () => { })
                .on('end', () => {
                    fs.createReadStream('XPaths.csv')
                        .pipe(csvReader())
                        .on('data', xpath => {
                            headers.push(Object.values(xpath)[0])
                            xpaths.push(Object.values(xpath)[1])
                        })
                        .on('end', () => {
                            const start = currentIndex;
                            if (start >= inputURLs.length || state) {
                                if (state) {
                                    if (state.includes("RedFlags") && moment().utcOffset("-05:30", true).diff(moment(time, "YYYY-MM-DD hh:mm A"), 'm') > 10)
                                        jsonfile.readFile("Scrapping/config.json").then(data => {
                                            fs.writeFile("Scrapping/config.json", JSON.stringify({
                                                ...data, state: ""
                                            }, null, 4), () => { });
                                        });
                                    return;
                                }
                            }
                            console.log(`Processing: ${inputURLs.length} records`)
                            const writer = csvWriter({ sendHeaders: false });
                            writer.pipe(fs.createWriteStream(`Scrapping/Extract.csv`, { flags: 'a' }));
                            const failedCSV = csvWriter({ sendHeaders: false });
                            failedCSV.pipe(fs.createWriteStream(`Scrapping/Retry.csv`, { flags: 'a' }));
                            const failedCSV2 = csvWriter({ sendHeaders: false });
                            failedCSV2.pipe(fs.createWriteStream(`Scrapping/Failed.csv`, { flags: 'a' }));

                            (async () => {
                                let redFlags = 0, exitCode = false;
                                try {
                                    function dumpExtractor() {
                                        consoleLogger.timeEnd('Execution Timer');
                                        const finalTime = parseInt(performance.now() - processStart) / 1000;
                                        fs.appendFileSync('Scrapping/logs.txt', `\nTotal Time: ${finalTime} secs\n`);
                                        fs.appendFileSync('Scrapping/logs.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                        fs.appendFileSync('Scrapping/errors.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                        fs.appendFileSync('Scrapping/failedURLs.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                        browser.close();
                                    }
                                    consoleLogger.log("----------------------------------------------------------------------------------");
                                    consoleLogger.log(`Starting executions for ${inputURLs.length} URLs`)
                                    consoleLogger.log("----------------------------------------------------------------------------------");
                                    fs.appendFileSync('Scrapping/logs.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                    fs.appendFileSync('Scrapping/errors.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                    fs.appendFileSync('Scrapping/failedURLs.txt', `------------------------------------------------------------------------------------------------ \n\n`);
                                    consoleLogger.time('Execution Timer');
                                    const processStart = performance.now();
                                    const browser = await puppeteer.launch({
                                        args: [
                                            "--lang=en-GB",
                                            "--no-sandbox",
                                            "--disable-setuid-sandbox",
                                            "--disable-gpu",
                                            "--disable-dev-shm-usage",
                                        ],
                                        defaultViewport: null,
                                        // headless: false,
                                        pipe: true,
                                        slowMo: 30,
                                    });
                                    const context = browser.defaultBrowserContext();
                                    await context.overridePermissions(URL.origin, ['clipboard-read']);

                                    for (i = start; i < inputURLs.length; i++) {
                                        consoleLogger.time('Extraction Timer');
                                        const startTime = performance.now();
                                        const page = await browser.newPage();
                                        console.log("URL #" + (i + 1 + (i >= limit ? "-" + failedIds[i - limit] : "")) + " | " + inputIds[i] + " | " + moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A'));
                                        consoleLogger.log("URL #" + (i + 1 + (i >= limit ? "-" + failedIds[i - limit] : "")) + " | " + inputIds[i])
                                        consoleLogger.log(moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A'));
                                        consoleLogger.log("Step - 1")
                                        await page.goto("https://search.google.com/test/mobile-friendly?url=" + inputURLs[i], {
                                            waitUntil: 'networkidle0',
                                        }).catch(ex => consoleLogger.log(ex.message));
                                        consoleLogger.log("Step - 2")
                                        await page.waitForTimeout(10000);
                                        await page.type('body > div[style*=visibility]', '')
                                            .then(async () => {
                                                consoleLogger.log("Captcha found..");
                                                await Promise.race([
                                                    page.solveRecaptchas(),
                                                    new Promise(resolve => setTimeout(resolve, 120000, "Timeout"))
                                                ]).then(value => {
                                                    if (value === "TimeOut")
                                                        consoleLogger.log("2captcha timeout exceeded");
                                                    else
                                                        consoleLogger.log("Captcha solved..");
                                                }).catch(ex => {
                                                    fs.appendFileSync('Scrapping/errors.txt', `${moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A')} | ${ex.message} \n`);
                                                    consoleLogger.log(ex.message);
                                                })
                                            })
                                            .catch(() => consoleLogger.log("No Captcha found.."))
                                        consoleLogger.log("Step - 3")
                                        const htmlContent = await page.waitForSelector("[data-tooltip=Copy]")
                                            .then(async () => {
                                                await page.waitForTimeout(5000);
                                                consoleLogger.log("Step - 4")
                                                return await page.evaluate(async () => {
                                                    document.querySelector("[data-tooltip=Copy]").click();
                                                    new Promise(resolve => setTimeout(resolve, 5000));
                                                    return await navigator.clipboard.readText();
                                                });
                                            })
                                            .catch(ex => {
                                                consoleLogger.log(ex.message);
                                                return "";
                                            });
                                        consoleLogger.log("Step - 5")
                                        consoleLogger.log(htmlContent.length);
                                        consoleLogger.timeEnd('Extraction Timer');
                                        const timeTaken = parseInt(performance.now() - startTime) / 1000;
                                        fs.appendFileSync('Scrapping/logs.txt', `#${i + 1 + (i >= limit ? "-" + failedIds[i - limit] : "")} | ${moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A')} | ${inputURLs[i]} | ${htmlContent.length} | ${timeTaken} secs\n`);
                                        if (htmlContent.length < 1000) {
                                            failedURLs.push({
                                                index: i < limit ? i + 1 : failedIds[i - limit],
                                                url: inputURLs[i],
                                                URLID: inputIds[i]
                                            });
                                            if (i < limit)
                                                failedCSV.write(failedURLs[failedURLs.length - 1]);
                                            else
                                                failedCSV2.write(failedURLs[failedURLs.length - 1]);
                                            await axios.post(
                                                'https://datacleaner.whoisvisiting.com/LinkedInPersonDataFail.ashx',
                                                {
                                                    URLID: inputIds[i],
                                                    URL: inputURLs[i]
                                                }, {
                                                headers: {
                                                    Authorization: 'BFCC45E1-DAB4-4303-A987-F1E50C6350E2'
                                                }
                                            })
                                                .then(res => {
                                                    consoleLogger.log(`${res.status} ${res.statusText}`)
                                                })
                                                .catch(error => {
                                                    if (error.response)
                                                        consoleLogger.log(`${error.response.status}\n${error.response.statusText}`);
                                                    else
                                                        console.log(error);
                                                });
                                            fs.appendFileSync('Scrapping/failedURLs.txt', `#${i + 1 + (i >= limit ? "-" + failedIds[i - limit] : "")} | ${moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A')} | ${inputURLs[i]} | ${htmlContent.length} \n`);

                                            const consecFails = failedURLs.map(({ index }) => index);
                                            if (consecFails.includes(i) && consecFails.includes(i - 1)) {
                                                redFlags++;
                                                consoleLogger.log(redFlags + ' Red flags have been raised.');
                                            }

                                            if (redFlags > 4) {
                                                consoleLogger.log("Terminating...");
                                                const finalTime = parseInt(performance.now() - processStart) / 1000;
                                                consoleLogger.log('Maximum Redflags have been reached...\nTotal Time Taken: ' + finalTime);
                                                jsonfile.readFile("Scrapping/config.json").then(data => {
                                                    fs.writeFile("Scrapping/config.json", JSON.stringify({
                                                        ...data, state: "Maximum RedFlags.. Exporting Stopped!!!"
                                                    }, null, 4), () => { });
                                                });
                                                dumpExtractor();
                                                consoleLogger.log("Exporting Stopped!!!")
                                                console.log("Maximum RedFlags.. Exporting Stopped!!!");
                                                exitCode = true;
                                            }
                                        }
                                        else {
                                            consoleLogger.log("Step - 6");
                                            await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
                                                .catch(ex => consoleLogger.log(ex.message))
                                            consoleLogger.log("Step - 7");
                                            const extractorIndex = i < limit ? i + 1 : parseInt(failedIds[i - limit]);
                                            const extractedData = await page.evaluate((Index, URL, URLID, xpaths, headers) => {
                                                const extractedData = { Index, URL, URLID };
                                                xpaths.forEach((xpath, index) =>
                                                    extractedData[headers[index]] = document.evaluate(xpath, document, null, XPathResult.STRING_TYPE).stringValue.replace(/\n /gm, "").trim()
                                                );
                                                let Experience = document.evaluate('count(//li[contains(@class, "experience-item")])', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Experience) {
                                                    const items = [];
                                                    const node = document.evaluate('//li[contains(@class, "experience-item")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const companyProfile = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "A");
                                                        const image = companyProfile && companyProfile.children[0];
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            CompanyImage: finalImage ? finalImage.nodeValue : "",
                                                            CompanyProfile: companyProfile ? companyProfile.href : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    Experience = JSON.stringify(items);
                                                }
                                                else
                                                    Experience = "";
                                                let Activities = document.evaluate('count(//li[contains(@class, "activities-section__item--posts")])', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Activities) {
                                                    const items = [];
                                                    const node = document.evaluate('//li[contains(@class, "activities-section__item--posts")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children[0].children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const link = Array.from(node.snapshotItem(i).children[0].children).find(item => item.nodeName === "A");
                                                        const image = link && link.children[0];
                                                        const attribution = Array.from(container.children).find(item => item.className === "activity-card__attribution");
                                                        const meta = Array.from(container.children).find(item => item.className === "activity-card__meta");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Image: finalImage ? finalImage.nodeValue : "",
                                                            Link: link ? link.href : "",
                                                            Attribution: attribution ? attribution.innerText : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    Activities = JSON.stringify(items);
                                                }
                                                else
                                                    Activities = "";
                                                let Education = document.evaluate('count(//li[contains(@class, "education__list-item")])', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Education) {
                                                    const items = [];
                                                    const node = document.evaluate('//li[contains(@class, "education__list-item")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const link = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "A");
                                                        const image = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "IMG");
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            Link: link ? link.href : "",
                                                            Image: finalImage ? finalImage.nodeValue : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    Education = JSON.stringify(items);
                                                }
                                                else
                                                    Education = "";
                                                let Languages = document.evaluate('count(//ul[@class="languages__list"]//li[contains(@class, "result-card")])', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Languages) {
                                                    const items = [];
                                                    const node = document.evaluate('//ul[@class="languages__list"]//li[contains(@class, "result-card")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    Languages = JSON.stringify(items);
                                                }
                                                else
                                                    Languages = "";
                                                let Groups = document.evaluate('count(//section[@data-section="groups"]//li)', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Groups) {
                                                    const items = [];
                                                    const node = document.evaluate('//section[@data-section="groups"]//li', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const link = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "A");
                                                        const image = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "IMG");
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            Link: link ? link.href : "",
                                                            Image: finalImage ? finalImage.nodeValue : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    Groups = JSON.stringify(items);
                                                }
                                                else
                                                    Groups = "";
                                                let Recommendations = document.evaluate('count(//li[@class="recommendations__list-item"]//p)', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (Recommendations) {
                                                    const items = [];
                                                    const node = document.evaluate('//li[@class="recommendations__list-item"]//p', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        items.push({
                                                            Description: node.snapshotItem(i).innerText,
                                                        });
                                                    }
                                                    Recommendations = JSON.stringify(items);
                                                }
                                                else
                                                    Recommendations = "";
                                                let PeopleViewed = document.evaluate('count(//section[contains(@class, "browsemap")]//li)', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (PeopleViewed) {
                                                    const items = [];
                                                    const node = document.evaluate('//section[contains(@class, "browsemap")]//li', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const link = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "A");
                                                        const image = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "IMG");
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            ProfileLink: link ? link.href : "",
                                                            Image: finalImage ? finalImage.nodeValue : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    PeopleViewed = JSON.stringify(items);
                                                }
                                                else
                                                    PeopleViewed = "";
                                                let OthersNamed = document.evaluate('count(//section[contains(@class, "samename")]//li)', document, null, XPathResult.NUMBER_TYPE).numberValue;
                                                if (OthersNamed) {
                                                    const items = [];
                                                    const node = document.evaluate('//section[contains(@class, "samename")]//li', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                                                    for (let i = 0; i < node.snapshotLength; i++) {
                                                        const container = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "DIV");
                                                        if (!container)
                                                            continue;
                                                        const title = Array.from(container.children).find(item => item.nodeName === "H3");
                                                        const subtitle = Array.from(container.children).find(item => item.nodeName === "H4");
                                                        const link = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "A");
                                                        const image = Array.from(node.snapshotItem(i).children).find(item => item.nodeName === "IMG");
                                                        const meta = Array.from(container.children).find(item => item.nodeName === "DIV");
                                                        const finalImage = image ? (image.attributes["data-delayed-url"] || image.attributes["data-ghost-url"] || image.attributes["src"]) : "";

                                                        items.push({
                                                            Title: title ? title.innerText : "",
                                                            Subtitle: subtitle ? subtitle.innerText : "",
                                                            ProfileLink: link ? link.href : "",
                                                            Image: finalImage ? finalImage.nodeValue : "",
                                                            Meta: meta ? meta.innerText : "",
                                                        });
                                                    }
                                                    OthersNamed = JSON.stringify(items);
                                                }
                                                else
                                                    OthersNamed = "";
                                                return { ...extractedData, Experience, Activities, Education, Languages, Groups, Recommendations, PeopleViewed, OthersNamed };
                                            }, extractorIndex, inputURLs[i], inputIds[i], xpaths, headers);
                                            consoleLogger.log("Step - 8");
                                            writer.write(extractedData);

                                            await axios.post(
                                                'https://datacleaner.whoisvisiting.com/LinkedInPersonPost.ashx',
                                                {
                                                    ...extractedData,
                                                    Experience: extractedData.Experience ? JSON.parse(extractedData.Experience) : [],
                                                    Activities: extractedData.Activities ? JSON.parse(extractedData.Activities) : [],
                                                    Education: extractedData.Education ? JSON.parse(extractedData.Education) : [],
                                                    Languages: extractedData.Languages ? JSON.parse(extractedData.Languages) : [],
                                                    Groups: extractedData.Groups ? JSON.parse(extractedData.Groups) : [],
                                                    Recommendations: extractedData.Recommendations ? JSON.parse(extractedData.Recommendations) : [],
                                                    PeopleViewed: extractedData.PeopleViewed ? JSON.parse(extractedData.PeopleViewed) : [],
                                                    OthersNamed: extractedData.OthersNamed ? JSON.parse(extractedData.OthersNamed) : []
                                                }, {
                                                headers: {
                                                    Authorization: 'BFCC45E1-DAB4-4303-A987-F1E50C6350E2'
                                                }
                                            })
                                                .then(res => {
                                                    consoleLogger.log(`${res.status} ${res.statusText}`)
                                                })
                                                .catch(error => {
                                                    if (error.response)
                                                        consoleLogger.log(`${error.response.status}\n${error.response.statusText}`);
                                                    else
                                                        console.log(error);
                                                })
                                        }
                                        fs.writeFile("Scrapping/config.json", JSON.stringify({
                                            currentIndex: i + 1,
                                            rows: inputURLs.length,
                                            time: moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A')
                                        }, null, 4), () => { });
                                        page.close().catch(() => { });
                                        if (exitCode)
                                            return;
                                        consoleLogger.log("----------------------------------------------------------------------------------");
                                    }
                                    writer.end();
                                    failedCSV.end();
                                    failedCSV2.end();
                                    const finalTime = parseInt(performance.now() - processStart) / 1000;
                                    consoleLogger.log('Congratulations.. Full extractions complete..\nTotal Time Taken: ' + finalTime + ' secs..');
                                    jsonfile.readFile("Scrapping/config.json").then(data => {
                                        fs.writeFile("Scrapping/config.json", JSON.stringify({
                                            ...data, state: "Exporting Finished!!!"
                                        }, null, 4), () => { });
                                    });
                                    dumpExtractor();
                                    consoleLogger.log("Exporting Finished!!!");
                                    console.log("Exporting Finished!!!");
                                }
                                catch (ex) {
                                    fs.appendFileSync('Scrapping/errors.txt', `${moment().utcOffset('+05:30').format('YYYY-MM-DD hh:mm A')} | ${ex.message} \n`);
                                    consoleLogger.log(`Critical Error!! Reached catch block.\nException Details: ${ex.message}`);
                                    consoleLogger.log(ex.message);
                                    console.log(ex.message);
                                }
                            })();
                        });
                });
        });
})();