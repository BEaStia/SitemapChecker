const axios = require('axios');
const xml2js = require('xml2js');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const unzip = zlib.createUnzip();
const Slack = require('slack-node');
const directoryPath = '/tmp/';

let checkSitemap = (event, context, callback) => {
  
  if (fs.exists(directoryPath + 'sitemap.xml'))
    fs.unlink(directoryPath + 'sitemap.xml');
  if (fs.exists(directoryPath + 'sitemap.xml.gz'))
    fs.unlink(directoryPath + 'sitemap.xml.gz');
  let promises = [];
  if (process.env.SITEMAP_URL !== null) {
    promises.push(axios.get(process.env.SITEMAP_URL).then(x => checkHomePageDate(x.data)))
  }
  if (process.env.SITEMAP_GZIP_URL !== null) {
    promises.push(fetchXml().then(checkHomePageDate))
  }
  
  Promise.all(promises).then((results) => {
    if (results.every((val, index) => val)) {
      callback(null, 'Sitemap is up-to-date');
    } else {
      webhookUri = process.env.SLACK_WEBHOOK;
  
      slack = new Slack();
      slack.setWebhook(webhookUri);
  
      slack.webhook({
        channel: process.env.SLACK_WEBHOOK_CHANNEL,
        username: "sitemap checker bot",
        text: "Oh! Sitemap is not up-to-date! Please, check aws lambda logs!"
      }, function(err, response) {
        console.log(response);
      });
      
      callback(new Error('Sitemap is out-of-date'));
    }
  });
};


let checkHomePageDate = (homepageXML) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(homepageXML, (err, result) => {
      if (err === null) {
        let date = result.urlset.url[0].lastmod[0];
        let diff_date = (Date.now() - Date.parse(date)) / 3600000;
        console.log(diff_date);
        const threshold = process.env.DATE_THRESHOLD || 24;
        resolve(diff_date < threshold);
      } else {
        reject(err);
      }
    });
  });
};

exports.handler = checkSitemap;


const download = function(url, dest, cb) {
  let file = fs.createWriteStream(dest);
  http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};


let fetchXml = () => {
  return new Promise((resolve, reject) => {
    download(process.env.SITEMAP_GZIP_URL, directoryPath + 'sitemap.xml.gz', (err) => {
      if (err === undefined) {
        const inp = fs.createReadStream(directoryPath + 'sitemap.xml.gz');
        const out = fs.createWriteStream(directoryPath + 'sitemap.xml');
        inp.pipe(unzip).pipe(out);
        out.on('finish', function () {
          fs.readFile(directoryPath + 'sitemap.xml', 'utf8', (err, result) => {
            if (err) reject(err);
            resolve(result);
          });
        });
      } else {
        reject(err);
      }
    })
  });
};


