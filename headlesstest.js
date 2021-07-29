const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const pdf = require('pdf-parse');

var fs = require('fs');
var path = require('path');
global.appRoot = path.resolve(__dirname);


function footerT(page) {
    var footer = `<div class="footerPuppeteer" style="border-top: solid 1px #bbb; width: 100%; font-size: 9px; padding: 5px 5px 0; color: #bbb; position: relative;">`
    if (page === 'first') {
        footer += `<div style="position: absolute; left: 5px; top: 5px;">This is a different footer for the First Page</div>`;
        footer += `<div style="position: absolute; right: 5px; top: 5px;">First Page</div>`;
    } else if (page === 'last') {
        footer += `<div style="position: absolute; left: 5px; top: 5px;">This is a different footer for the Last Page</div>`
        footer += `<div style="position: absolute; right: 5px; top: 5px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
    } else {
        footer += `<div style="position: absolute; left: 5px; top: 5px;"><span class="date"></span></div>`;
        footer += `<div style="position: absolute; right: 5px; top: 5px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
    }
    footer += `</div>`;
    return footer
}



function base64Encode(file) {
    return fs.readFileSync(file, { encoding: 'base64' });
}

function logo() {
    return '<div></div>';
}

(async() => {
    console.time('start');
    console.time('launch');
    const browser = await puppeteer.launch();
    console.timeEnd('launch');
    console.time('newPage');
    const page = await browser.newPage();
    console.timeEnd('newPage');
    console.time('goto');
    await page.goto(`file:${path.join(__dirname, 'example.html')}`); //await page.goto(pageURL);
    console.timeEnd('goto');
    console.time('waitForFun');
    const watchDog = page.waitForFunction('done.length === 4');
    await watchDog;
    console.timeEnd('waitForFun');
    console.time('firstPDF');

    const firstPage = await page.pdf({
        displayHeaderFooter: true,
        headerTemplate: logo(),
        footerTemplate: footerT("first"),
        pageRanges: '1',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('firstPDF');

    console.time('secondPDF');
    await page.pdf({
        path: 'portrait3.pdf',
        displayHeaderFooter: true,
        headerTemplate: logo(),
        footerTemplate: footerT("main"),
        pageRanges: '2-',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('secondPDF');

    const mainPDFBuffer = fs.readFileSync('portrait3.pdf');
    const pdfForPageNums = await pdf(mainPDFBuffer);
    let numPages = pdfForPageNums.numpages;

    console.time('thirdPDF');
    const lastPage = await page.pdf({
        displayHeaderFooter: true,
        headerTemplate: logo(),
        footerTemplate: footerT("last"),
        pageRanges: `${numPages + 1}`,
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('thirdPDF');

    console.time('PDF Merges');
    let firstPageDoc = await PDFDocument.load(firstPage);
    let lastPageDoc = await PDFDocument.load(lastPage);
    let mainPDF = await PDFDocument.load(mainPDFBuffer);
    let copiedFirstPage = await mainPDF.copyPages(firstPageDoc, [0]);
    let copiedLastPage = await mainPDF.copyPages(lastPageDoc, [0]);
    mainPDF.removePage(numPages - 1); //Delete last page with wrong footer
    mainPDF.insertPage(0, copiedFirstPage[0]); //Add first page
    mainPDF.addPage(copiedLastPage[0]); //Add last page with correct footer

    fs.writeFileSync('portrait3.pdf', await mainPDF.save());
    console.timeEnd('PDF Merges');
    await browser.close();
    console.timeEnd('start');
})();