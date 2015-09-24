import 'babel/register'
import http from 'http'
import url from 'url'
// import fs from 'fs'
import pdf from 'html-pdf'
import _ from 'underscore-contrib'
import send from './cat/mail'

const server = http.createServer()

server.on('request', (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Request-Method', 'POST');
  response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  response.setHeader('Access-Control-Allow-Headers', '*');

  if (request.method === 'POST') {
    const {query} = url.parse(request.url),
          {email} = _.fromQuery(query)

    let html = ''

    request.on('data', chunk => {
      html += chunk.toString()
    })

    request.on('end', () => {
      response.writeHead(200, "OK", {'Content-Type': 'text/html'})
      response.write('<html><head><title>Success</title></head><body><h1>Success!</h1></body></html>')
      response.end()

      // TODO http-pdf, then save to file

      pdf.create(html).toFile('./Catalogue.pdf', (err, res) => {
        if (err) console.error(err)
        else send(email, res.filename)
      })
    })

  } else if (request.method === 'OPTIONS') {
		response.writeHead(200)
		response.end()
	} else {
    console.log("[405] " + request.method + " to " + request.url)
    response.writeHead(405, "Method not supported", {'Content-Type': 'text/html'})
    response.end('<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>')
  }
})

server.listen(process.env.PORT || 8080)
