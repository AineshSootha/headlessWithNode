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

function emptyHeader() {
    return '<div></div>';
}

(async() => {
    const pageURL = process.argv[2];
    const outputPath = process.argv[3];

    console.log(pageURL);
    console.time('start');

    console.time('launch');
    const browser = await puppeteer.launch({});
    console.timeEnd('launch');

    console.time('newPage');
    const page = await browser.newPage();
    console.timeEnd('newPage');




    let isPrintReady = false;
    page.on('console', msg => {
        console.log(msg.text());
        if (msg.text() === 'print-ready') {
            console.log("Print Ready Now. Proceeding with pdf generation.");
            isPrintReady = true;
        }
    });
    page.exposeFunction("checkPrintReady", function() {
        return isPrintReady;
    });


    console.time('goto');
    await page.goto(pageURL);
    //console.log(`file:${path.join(__dirname, 'example.html')}`); //
    console.timeEnd('goto');

    console.time('waitForFun');
    console.log("Waiting for print-ready message");
    await page.waitForFunction(() => {
        return checkPrintReady();
    })
    console.log("print-ready message received");
    console.timeEnd('waitForFun');

    console.time('firstPDF');
    const firstPage = await page.pdf({
        displayHeaderFooter: true,
        headerTemplate: emptyHeader(),
        footerTemplate: footerT("first"),
        pageRanges: '1',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('firstPDF');

    console.time('secondPDF');
    await page.pdf({
        path: outputPath,
        displayHeaderFooter: true,
        headerTemplate: emptyHeader(),
        footerTemplate: footerT("main"),
        pageRanges: '2-',
        margin: { top: "50px", bottom: "100px" },
    });
    console.timeEnd('secondPDF');

    const mainPDFBuffer = fs.readFileSync(outputPath);
    const pdfForPageNums = await pdf(mainPDFBuffer);
    let numPages = pdfForPageNums.numpages;

    console.time('thirdPDF');
    const lastPage = await page.pdf({
        displayHeaderFooter: true,
        headerTemplate: emptyHeader(),
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
    fs.writeFileSync(outputPath, await mainPDF.save());
    console.timeEnd('PDF Merges');
    await browser.close();
    console.timeEnd('start');
})();