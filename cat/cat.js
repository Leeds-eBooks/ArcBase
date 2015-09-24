import fs from 'fs'
import path from 'path'
import pdf from 'html-pdf'

const html = fs.readFileSync(path.join('./cat/Catalogue.html'), 'utf8')
const options = {format: 'A5'}

pdf.create(html, options)
.toFile(path.join('./cat/Catalogue.pdf'), (err, res) => {
  if (err) return console.error(err)
  else console.log(res)
})
