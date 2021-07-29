const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

var fs = require('fs');
var path = require('path');
global.appRoot = path.resolve(__dirname);

var footerCalls = 0;

function footerTFirstPage() {
    return `
    <style>
        footer:first-of-type{
            color: aqua;
        }
    </style>
    <footer class="footerPuppeteer" style="border-top: solid 1px #bbb; width: 100%; font-size: 9px;
    padding: 5px 5px 0; color: #bbb; position: relative;">
        <div style="position: absolute; left: 5px; top: 5px;">Header Page</div>
        <div style="position: absolute; right: 5px; top: 5px;">First Page</div>
    </footer>
    `
}

function footerT() {
    footerCalls++;
    return `
    <style>
        footer:first-of-type{
            color: aqua;
        }
    </style>
    <footer class="footerPuppeteer" style="border-top: solid 1px #bbb; width: 100%; font-size: 9px;
    padding: 5px 5px 0; color: #bbb; position: relative;">
        <div style="position: absolute; left: 5px; top: 5px;"><span class="date"></span></div>
        <div style="position: absolute; right: 5px; top: 5px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
    </footer>
    `
}

function base64Encode(file) {
    return fs.readFileSync(file, { encoding: 'base64' });
}

function logo() {
    return '<img height="50px" src="data:image/png;base64,' + base64Encode(appRoot + "/logo.png") + '"/>';
}

(async() => {
    console.time('start');
    console.time('launch');
    const browser = await puppeteer.launch();
    console.timeEnd('launch');
    console.time('newPage');
    const page = await browser.newPage();
    console.timeEnd('newPage');
    //const pageURL = 'file://${path.join(__dirname, example.html'
    console.time('goto');
    await page.goto(`file:${path.join(__dirname, 'example.html')}`); //await page.goto(pageURL);
    console.timeEnd('goto');
    console.time('waitForFun');
    const watchDog = page.waitForFunction('done.length === 4');
    await watchDog;
    console.timeEnd('waitForFun');
    console.time('firstPDF');
    const page1 = await page.pdf({
        //path: 'portrait3.pdf',
        displayHeaderFooter: true,
        headerTemplate: logo(),
        footerTemplate: footerTFirstPage(),
        pageRanges: '1',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('firstPDF');
    console.time('secondPDF');
    await page.pdf({
        path: 'portrait3.pdf',
        displayHeaderFooter: true,
        headerTemplate: logo(),
        footerTemplate: footerT(),
        pageRanges: '2-',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('secondPDF');
    console.time('PDF Merges');
    const page1Doc = await PDFDocument.load(page1);
    const mainPDFBuffer = fs.readFileSync('portrait3.pdf');
    const mainPDF = await PDFDocument.load(mainPDFBuffer);
    const copiedPage1 = await mainPDF.copyPages(page1Doc, [0]);
    mainPDF.insertPage(0, copiedPage1[0]);
    fs.writeFileSync('portrait3.pdf', await mainPDF.save());
    console.timeEnd('PDF Merges');
    await browser.close();
    console.timeEnd('start');
})();